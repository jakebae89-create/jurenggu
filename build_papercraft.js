// 주령구(14면체) 인쇄용 전개도 생성기 — 흑백, A4 다중 페이지, 한자 + 영문 설명
// 앱(index.html)과 동일한 기하/벌칙 데이터를 그대로 사용.
const fs = require('fs');
const path = require('path');

// ---------- 벡터 헬퍼 (3D) ----------
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const norm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l];};

// ---------- 기하 (index.html과 동일) ----------
const B=1;
const C=-1+Math.sqrt(3+4/Math.sqrt(3)); // ≈1.3042

function buildVertices(){
  const mags=[0,B,C];
  const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const seen=new Set(), out=[];
  for(const p of perms){
    for(let sx=-1;sx<=1;sx+=2) for(let sy=-1;sy<=1;sy+=2) for(let sz=-1;sz<=1;sz+=2){
      const v=[mags[p[0]]*sx, mags[p[1]]*sy, mags[p[2]]*sz];
      const k=v.map(x=>x.toFixed(6)).join(',');
      if(!seen.has(k)){ seen.add(k); out.push(v); }
    }
  }
  return out;
}
const VERTS=buildVertices(); // 24개

const SQUARE_CENTERS=[[C,0,0],[-C,0,0],[0,C,0],[0,-C,0],[0,0,C],[0,0,-C]];
const HEX_CENTERS=[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]];

// 경주문화원 공식 자료 기준 (index.html의 descEn과 동일하게 유지)
// 배열 순서 = 면 위치(SQUARE_CENTERS/HEX_CENTERS) 배정.
// 이 순서는 임의가 아니라 실물 전개도 사진에서 읽은 인접 관계 + 방향(반시계) 제약으로
// solve_assignment.js가 푼 결과다. 순서를 바꾸면 어느 벌칙이 어느 면에 오는지가 바뀐다.
const SQUARE_RULES=[
 {hanja:'禁聲作儛',en:'Dance with no music playing.'},
 {hanja:'有犯空過',en:'Put up with whatever anyone does to you.'},
 {hanja:'飮盡大咲',en:'Drain the cup you were given and laugh out loud.'},
 {hanja:'衆人打鼻',en:'Let everyone hit your nose.'},
 {hanja:'自唱自飮',en:'Sing by yourself, then drink by yourself.'},
 {hanja:'三盞一去',en:'Drink three cups at once.'},
];
const HEX_RULES=[
 {hanja:'任意請歌',en:'Ask anyone you like to sing a song.'},
 {hanja:'醜物莫放',en:'Show everyone something embarrassing.'},
 {hanja:'曲臂則盡',en:'Link arms with the person next to you and drink.'},
 {hanja:'空詠詩過',en:'Compose a poem on the spot and recite it.'},
 {hanja:'兩盞則放',en:'Drink two cups back to back.'},
 {hanja:'弄面孔過',en:'Stay still even when someone tickles your face.'},
 {hanja:'月鏡一曲',en:'Look at the moon and sing a song.'},
 {hanja:'自唱怪來晚',en:'Sing alone, then shout at the top of your lungs.'},
];

const eq=(a,b)=>Math.abs(a-b)<1e-6;
function vidx(v){ return VERTS.findIndex(w=>eq(w[0],v[0])&&eq(w[1],v[1])&&eq(w[2],v[2])); }

// 면의 꼭짓점 선택 (index.html 로직)
function squareFaceVerts(center){
  const ai=center.findIndex(c=>c!==0); const val=center[ai];
  return VERTS.filter(v=>eq(v[ai],val));
}
function hexFaceVerts(center){
  const [sx,sy,sz]=center;
  return VERTS.filter(v=> v[0]*sx>=-1e-9 && v[1]*sy>=-1e-9 && v[2]*sz>=-1e-9);
}

// 법선 기준 반시계 정렬
function orderFace(verts, normal){
  const c=scale(verts.reduce((a,v)=>add(a,v),[0,0,0]),1/verts.length);
  const n=norm(normal);
  const u=norm(sub(verts[0],c));
  const w=cross(n,u);
  return verts.map(v=>{
    const d=sub(v,c);
    const ang=Math.atan2(dot(d,w),dot(d,u));
    return {v,ang};
  }).sort((a,b)=>a.ang-b.ang).map(o=>o.v);
}

// 면 목록 구성
let faces=[];
SQUARE_CENTERS.forEach((c,i)=>{
  const ov=orderFace(squareFaceVerts(c),c);
  faces.push({type:'sq',ci:i,rule:SQUARE_RULES[i],normal:norm(c),vi:ov.map(vidx)});
});
HEX_CENTERS.forEach((c,i)=>{
  const ov=orderFace(hexFaceVerts(c),c);
  faces.push({type:'hex',ci:i,rule:HEX_RULES[i],normal:norm(c),vi:ov.map(vidx)});
});

// 무결성 체크
faces.forEach((f,i)=>{
  const expect=f.type==='sq'?4:6;
  if(f.vi.length!==expect) throw new Error(`face ${i} has ${f.vi.length} verts`);
});

// ---------- 각 면의 로컬 2D 좌표 (바깥면이 위를 보도록) ----------
// 주의: SVG는 y축이 아래로 향한다. e2 = n×e1 (우수계)로 잡으면 화면상 상하가 뒤집혀
// 면을 '안쪽'에서 본 그림이 되고, 접으면 거울상 주사위가 나온다.
// 따라서 e2 = e1×n 으로 잡아 SVG 좌표계에서 '바깥면을 정면으로 본' 전개도가 되게 한다.
const UNIT_MM = 30; // 사각형 변(√2단위) ≈ 42mm
faces.forEach(f=>{
  const P=f.vi.map(i=>VERTS[i]);
  const o=P[0];
  const e1=norm(sub(P[1],o));
  const e2=norm(cross(e1,f.normal)); // SVG(y-down)에서 바깥면이 정면으로 보이는 축
  f.o=o; f.e1=e1; f.e2=e2;
  f.local=P.map(p=>{
    const d=sub(p,o);
    return [dot(d,e1)*UNIT_MM, dot(d,e2)*UNIT_MM];
  });
});

// ---------- 폴리헤드론 엣지 맵 ----------
// key: "min,max" of vertex indices -> {faces:[{fi, ei}], }
const edgeMap=new Map();
faces.forEach((f,fi)=>{
  const n=f.vi.length;
  for(let e=0;e<n;e++){
    const a=f.vi[e], b=f.vi[(e+1)%n];
    const key=a<b?`${a},${b}`:`${b},${a}`;
    if(!edgeMap.has(key)) edgeMap.set(key,[]);
    edgeMap.get(key).push({fi,ei:e,a,b});
  }
});

// 인접: faceIndex -> [{nb, edgeKey, ei}]
const adj=faces.map(()=>[]);
for(const [key,arr] of edgeMap){
  if(arr.length===2){
    const [x,y]=arr;
    const [va,vb]=key.split(',').map(Number);
    const elen=len(sub(VERTS[va],VERTS[vb]))*UNIT_MM;
    adj[x.fi].push({nb:y.fi,key,ei:x.ei,elen});
    adj[y.fi].push({nb:x.fi,key,ei:y.ei,elen});
  }
}
const norm2=a=>{const l=Math.hypot(a[0],a[1])||1; return [a[0]/l, a[1]/l];};

// ---------- 면별 글자 방향(고증) ----------
// 각 면의 글자 '위쪽'이 어느 이웃 면 쪽을 향하는지로 정의한다.
// 이렇게 두면 (1) 사람이 실물 사진 보고 검증·수정하기 쉽고
//            (2) 전개도를 어떻게 펼치든 접었을 때 방향이 항상 같으며
//            (3) index.html의 3D와 같은 표를 공유할 수 있다.
// ※ 값은 실물 대조로 확정해야 하는 고증 데이터. index.html의 FACE_UP과 반드시 동일하게 유지.
// 📐 = 목제주령구 전개도(자료/주령구 전개도.jpg)에서 각도로 측정한 값 (2026-07-26)
//      측정법: 면의 글자 세로열 방향(글자 위쪽 각도)을 재고, 그 면의 변 법선(육각=60°·사각=90° 간격,
//      육각면은 등각육각형이라 정확히 60° 간격)과 맞춘 뒤 그 변 너머 이웃을 읽는다.
// 미확정 = 유효한 이웃이긴 하나 아직 도면에서 측정 못 한 값. 추가 판독 필요.
const FACE_UP = {
  // 사각면 6
  '禁聲作儛': '曲臂則盡',   // 📐 (도면 중앙 사각면, 글자 위=위쪽 면)
  '有犯空過': '月鏡一曲',   // 미확정
  '自唱自飮': '兩盞則放',   // 미확정
  '三盞一去': '空詠詩過',   // 미확정
  '飮盡大咲': '醜物莫放',   // 미확정
  '衆人打鼻': '空詠詩過',   // 미확정
  // 육각면 8
  '任意請歌': '曲臂則盡',   // 📐 글자 위 ≈ 330°, 변 법선 326°
  '曲臂則盡': '禁聲作儛',   // 미확정
  '醜物莫放': '禁聲作儛',   // 미확정
  '空詠詩過': '醜物莫放',   // 📐 글자 위 ≈ 147°, 변 법선 151°
  '兩盞則放': '月鏡一曲',   // 미확정
  '月鏡一曲': '曲臂則盡',   // 미확정
  '弄面孔過': '有犯空過',   // 미확정
  '自唱怪來晚': '月鏡一曲', // 미확정
};

// 면 3D 중심
faces.forEach(f=>{ f.cen3=scale(f.vi.map(i=>VERTS[i]).reduce((a,v)=>add(a,v),[0,0,0]), 1/f.vi.length); });

// FACE_UP → 면 평면 위의 3D 위쪽 벡터 → 면 로컬 2D 방향
faces.forEach((f,fi)=>{
  const want=FACE_UP[f.rule.hanja];
  if(!want) throw new Error(`FACE_UP에 '${f.rule.hanja}' 항목이 없습니다`);
  const link=adj[fi].find(a=>faces[a.nb].rule.hanja===want);
  if(!link) throw new Error(`'${f.rule.hanja}'의 이웃이 아닙니다: '${want}' (이웃: ${adj[fi].map(a=>faces[a.nb].rule.hanja).join(', ')})`);
  const [va,vb]=link.key.split(',').map(Number);
  const mid=scale(add(VERTS[va],VERTS[vb]),0.5);
  const up3=norm(sub(mid,f.cen3));            // 면 평면 안의 '위쪽'
  f.upLocal=norm2([dot(up3,f.e1), dot(up3,f.e2)]); // 면 로컬 2D에서의 위쪽
});

// 짧은 변(육각-육각)을 우선 접기(fold)로 → 긴 변(사각-육각)이 풀칠 이음선이 되어 탭이 크고 깔끔
adj.forEach(a=>a.sort((p,q)=>p.elen-q.elen));

// ---------- 2D 헬퍼 ----------
const s2=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const rot2=(p,ang)=>[p[0]*Math.cos(ang)-p[1]*Math.sin(ang), p[0]*Math.sin(ang)+p[1]*Math.cos(ang)];
function transformPts(pts, ang, t){ return pts.map(p=>{const r=rot2(p,ang); return [r[0]+t[0], r[1]+t[1]];}); }

// 볼록 다각형 SAT 겹침 (mm 단위, epsilon 여유)
function convexOverlap(A,B,eps=0.5){
  const axes=[];
  const addAxes=(poly)=>{
    for(let i=0;i<poly.length;i++){
      const p=poly[i], q=poly[(i+1)%poly.length];
      const e=[q[0]-p[0], q[1]-p[1]];
      const n=[-e[1], e[0]]; const l=Math.hypot(n[0],n[1])||1;
      axes.push([n[0]/l,n[1]/l]);
    }
  };
  addAxes(A); addAxes(B);
  for(const ax of axes){
    let minA=Infinity,maxA=-Infinity,minB=Infinity,maxB=-Infinity;
    for(const p of A){const d=p[0]*ax[0]+p[1]*ax[1]; if(d<minA)minA=d; if(d>maxA)maxA=d;}
    for(const p of B){const d=p[0]*ax[0]+p[1]*ax[1]; if(d<minB)minB=d; if(d>maxB)maxB=d;}
    const overlap=Math.min(maxA,maxB)-Math.max(minA,minB);
    if(overlap<=eps) return false; // 분리축 존재
  }
  return true;
}

// ---------- 그리디 컴포넌트 언폴딩 ----------
const placed=new Array(faces.length).fill(null); // {pts:[[x,y]..], comp}
const treeEdges=new Set(); // key of edges used as folds
let comps=[];

function placeRootAt(fi){
  // 로컬 좌표 그대로 사용 (원점 부근) → 회전 없음
  const pts=faces[fi].local.map(p=>[p[0],p[1]]);
  placed[fi]={pts, comp:comps.length, ang:0};
  return pts;
}

// 자식 fi를 부모 pi의 배치에 맞춰 공유엣지로 접어 배치
function tryPlaceChild(pi, fi, key){
  // 공유 엣지의 두 정점
  const [va,vb]=key.split(',').map(Number);
  // 부모 배치에서 va,vb 위치
  const pf=faces[pi], cf=faces[fi];
  const pIa=pf.vi.indexOf(va), pIb=pf.vi.indexOf(vb);
  const PA=placed[pi].pts[pIa], PB=placed[pi].pts[pIb];
  // 자식 로컬에서 va,vb 위치
  const cIa=cf.vi.indexOf(va), cIb=cf.vi.indexOf(vb);
  const CA=cf.local[cIa], CB=cf.local[cIb];
  const dP=s2(PB,PA), dC=s2(CB,CA);
  const ang=Math.atan2(dP[1],dP[0])-Math.atan2(dC[1],dC[0]);
  // t: R*CA + t = PA
  const rCA=rot2(CA,ang);
  const t=[PA[0]-rCA[0], PA[1]-rCA[1]];
  const cand=transformPts(cf.local, ang, t);
  // 같은 컴포넌트 내 다른 배치 면과 겹치는지 (부모 제외)
  const compId=placed[pi].comp;
  for(let k=0;k<faces.length;k++){
    if(k===pi||k===fi) continue;
    if(placed[k]&&placed[k].comp===compId){
      if(convexOverlap(cand, placed[k].pts)) return null;
    }
  }
  return {pts:cand, ang}; // ang: 면 로컬 → 페이지 좌표 회전량 (글자 방향 계산에 사용)
}

// 서브넷당 최대 면 수 → 여러 페이지로 분할.
// 기본 7 = A4 2장(인쇄용). `--single`을 주면 14면을 한 장에 펼친다(실물 전개도와 대조용).
const MAX_FACES = process.argv.includes('--single') ? 14 : 7;
for(let start=0; start<faces.length; start++){
  if(placed[start]) continue;
  placeRootAt(start);
  let count=1;
  const queue=[start];
  while(queue.length){
    const pi=queue.shift();
    for(const {nb,key} of adj[pi]){
      if(placed[nb]) continue;
      if(count>=MAX_FACES) break;
      const cand=tryPlaceChild(pi,nb,key);
      if(cand){
        placed[nb]={pts:cand.pts, comp:placed[pi].comp, ang:cand.ang};
        treeEdges.add(key+':'+Math.min(pi,nb)+'-'+Math.max(pi,nb));
        queue.push(nb);
        count++;
      }
    }
  }
  comps.push({id:comps.length});
}

// ---------- 폴드 vs 심(seam) 판정 ----------
// 각 폴리헤드론 엣지: 두 면의 2D 엣지 좌표가 일치하면 fold, 아니면 seam
function edgePts(fi, va, vb){
  const f=faces[fi];
  const ia=f.vi.indexOf(va), ib=f.vi.indexOf(vb);
  return [placed[fi].pts[ia], placed[fi].pts[ib]];
}
const near=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<0.3;

// 탭(풀칠면) 사다리꼴 4점 & 겹침 점수(같은 컴포넌트 내 다른 면과 겹치는 개수)
const TAB_H=5; // mm
function _cen(pts){const c=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]);return[c[0]/pts.length,c[1]/pts.length];}
function edgeLenMM(fi,e){ const vs=faces[fi].vi; return len(sub(VERTS[vs[e]],VERTS[vs[(e+1)%vs.length]]))*UNIT_MM; }
function tabQuad(pts,e,insetArg,hh){
  const E0=pts[e],E1=pts[(e+1)%pts.length];
  const ex=E1[0]-E0[0],ey=E1[1]-E0[1],el=Math.hypot(ex,ey),ux=ex/el,uy=ey/el;
  let nx=-uy,ny=ux; const cen=_cen(pts),mx=(E0[0]+E1[0])/2,my=(E0[1]+E1[1])/2;
  if((mx-cen[0])*nx+(my-cen[1])*ny<0){nx=-nx;ny=-ny;}
  const h=hh!=null?hh:Math.min(TAB_H,el*0.35);
  const inset=insetArg!=null?insetArg:Math.min(h*0.9,el*0.25);
  return [E0,[E0[0]+ux*inset+nx*h,E0[1]+uy*inset+ny*h],[E1[0]-ux*inset+nx*h,E1[1]-uy*inset+ny*h],E1];
}
// 탭이 인접 면(자르는 선) 안쪽으로 파고드는 것을 허용하는 한계(mm). 꼭짓점 접촉(≈0)은 무시,
// 그 이상 파고들면 겹침으로 간주 → 탭을 줄여 컷 선을 넘지 않게 함.
const TAB_TOL=0.1;
function tabOverlapsAny(fi,e,inset,hh){
  const q=tabQuad(placed[fi].pts,e,inset,hh);
  for(let k=0;k<faces.length;k++){ if(k===fi) continue; if(placed[k]&&placed[k].comp===placed[fi].comp&&convexOverlap(q,placed[k].pts,TAB_TOL)) return true; }
  return false;
}
// 인접 면(컷 선)을 침범하지 않는 탭 치수:
// (1) 높이는 그대로 두고 폭(양끝 inset)부터 늘려 길이를 줄임 → (2) 그래도 안 되면 높이를 줄임
function fitTab(fi,e){
  const el=edgeLenMM(fi,e), hFull=Math.min(TAB_H,el*0.35);
  const base=Math.min(hFull*0.9, el*0.25), maxInset=el/2 - 1.0;
  for(let ins=base; ins<=maxInset; ins+=0.2){ if(!tabOverlapsAny(fi,e,ins,hFull)) return {inset:ins,h:hFull,full:true,ok:true}; }
  for(let h=hFull-0.3; h>=1.0; h-=0.3){ if(!tabOverlapsAny(fi,e,maxInset,h)) return {inset:maxInset,h,full:false,ok:true}; }
  return {inset:maxInset,h:1.0,full:false,ok:false}; // 겹침 불가피
}

let seamCounter=0;
const seamNo=new Map(); // key -> number
const faceEdgeInfo=faces.map(f=>f.vi.map(()=>({type:'seam'}))); // per face per edge

for(const [key,arr] of edgeMap){
  if(arr.length!==2){ continue; }
  const [x,y]=arr;
  const [xa,xb]=edgePts(x.fi,x.a,x.b);
  const [ya,yb]=edgePts(y.fi,y.a,y.b);
  // 두 면의 이 엣지가 2D상 일치? (일치 순서 or 뒤집힘)
  const coincide=(near(xa,ya)&&near(xb,yb))||(near(xa,yb)&&near(xb,ya));
  if(coincide){
    faceEdgeInfo[x.fi][x.ei]={type:'fold'};
    faceEdgeInfo[y.fi][y.ei]={type:'fold'};
  } else {
    if(!seamNo.has(key)){ seamCounter++; seamNo.set(key,seamCounter); }
    const no=seamNo.get(key);
    // 탭을 둘 수 있는 두 면 각각 최적 치수 계산 → 더 나은 쪽(전체높이 유지 & 폭 큰 쪽) 선택
    const fx=fitTab(x.fi,x.ei), fy=fitTab(y.fi,y.ei);
    const xSq=faces[x.fi].type==='sq', ySq=faces[y.fi].type==='sq';
    let pickX;
    if(fx.ok!==fy.ok) pickX=fx.ok;                           // (1순위) 컷 면과 안 겹치는 쪽 (요청 5)
    else if(xSq!==ySq) pickX=xSq;                            // (2순위) 사각형 면 쪽 (요청 1)
    else if(fx.full!==fy.full) pickX=fx.full;                // (3순위) 전체 높이 유지되는 쪽
    else if(Math.abs(fx.inset-fy.inset)>0.01) pickX=fx.inset<fy.inset; // (4순위) 폭 큰(inset 작은) 쪽
    else pickX = x.fi>y.fi;                                  // 동률이면 큰 인덱스
    const fit = pickX?fx:fy, tabFi = pickX?x.fi:y.fi;
    if(process.env.DBG) console.log(`seam#${no}: X=${faces[x.fi].rule.hanja}(${faces[x.fi].type},ok=${fx.ok}) Y=${faces[y.fi].rule.hanja}(${faces[y.fi].type},ok=${fy.ok}) -> tab on ${faces[tabFi].rule.hanja}`);
    faceEdgeInfo[x.fi][x.ei]={type:'seam',no,tab:(x.fi===tabFi),tabInset:fit.inset,tabH:fit.h};
    faceEdgeInfo[y.fi][y.ei]={type:'seam',no,tab:(y.fi===tabFi),tabInset:fit.inset,tabH:fit.h};
  }
}

// ---------- 컴포넌트별 바운딩 & 페이지 배치 ----------
function compFaces(cid){ return faces.map((_,i)=>i).filter(i=>placed[i]&&placed[i].comp===cid); }

function compBounds(cid){
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for(const fi of compFaces(cid)){
    for(const p of placed[fi].pts){
      minx=Math.min(minx,p[0]); miny=Math.min(miny,p[1]);
      maxx=Math.max(maxx,p[0]); maxy=Math.max(maxy,p[1]);
    }
  }
  // 탭 여유
  return {minx:minx-TAB_H-2,miny:miny-TAB_H-2,maxx:maxx+TAB_H+2,maxy:maxy+TAB_H+2};
}

const compData=comps.map(c=>{
  const b=compBounds(c.id);
  return {id:c.id, b, w:b.maxx-b.minx, h:b.maxy-b.miny};
});
// 큰 것부터
compData.sort((a,b)=>(b.w*b.h)-(a.w*a.h));

// A4 페이지 (mm)
// 기본 A4. --single(14면 통짜)은 A4를 넘치므로 A3로 키운다.
const SINGLE = MAX_FACES>7;
const PAGE_W=SINGLE?297:210, PAGE_H=SINGLE?420:297, MARGIN=10, HEADER=20;
const AREA_W=PAGE_W-2*MARGIN;
const pages=[]; // each: {items:[{cid, x, y}], }
function newPage(){ pages.push({items:[], cursorX:MARGIN, cursorY:MARGIN+HEADER, rowH:0}); return pages[pages.length-1]; }
newPage();
for(const cd of compData){
  let pg=pages[pages.length-1];
  // 현재 행에 안 들어가면 개행
  if(cd.w > AREA_W){ /* 너무 넓으면 그냥 배치(스케일은 고정) */ }
  if(pg.cursorX+cd.w > MARGIN+AREA_W+0.1){
    pg.cursorY+=pg.rowH+8; pg.cursorX=MARGIN; pg.rowH=0;
  }
  if(pg.cursorY+cd.h > PAGE_H-MARGIN){
    pg=newPage();
  }
  pg.items.push({cid:cd.id, x:pg.cursorX - cd.b.minx, y:pg.cursorY - cd.b.miny});
  pg.cursorX+=cd.w+8;
  pg.rowH=Math.max(pg.rowH,cd.h);
}

// ---------- SVG 생성 ----------
function centroid(pts){
  const c=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]);
  return [c[0]/pts.length, c[1]/pts.length];
}
function tabPath(E0,E1,face_centroid,insetOverride,hOverride){
  // 엣지 바깥쪽으로 사다리꼴 탭
  const ex=E1[0]-E0[0], ey=E1[1]-E0[1]; const el=Math.hypot(ex,ey);
  const ux=ex/el, uy=ey/el;
  let nx=-uy, ny=ux; // 법선
  // 면 중심 반대(바깥) 방향으로
  const mx=(E0[0]+E1[0])/2, my=(E0[1]+E1[1])/2;
  if((mx-face_centroid[0])*nx+(my-face_centroid[1])*ny < 0){ nx=-nx; ny=-ny; }
  const h=hOverride!=null?hOverride:Math.min(TAB_H, el*0.35);
  const inset=insetOverride!=null?insetOverride:Math.min(h*0.9, el*0.25);
  const P0=[E0[0]+ux*inset+nx*h, E0[1]+uy*inset+ny*h];
  const P1=[E1[0]-ux*inset+nx*h, E1[1]-uy*inset+ny*h];
  return `M ${E0[0].toFixed(2)} ${E0[1].toFixed(2)} L ${P0[0].toFixed(2)} ${P0[1].toFixed(2)} L ${P1[0].toFixed(2)} ${P1[1].toFixed(2)} L ${E1[0].toFixed(2)} ${E1[1].toFixed(2)}`;
}
// 탭(풀칠면) 중앙 좌표 — 번호를 여기에 표기
function tabCenter(E0,E1,face_centroid,hOverride){
  const ex=E1[0]-E0[0], ey=E1[1]-E0[1]; const el=Math.hypot(ex,ey);
  let nx=-ey/el, ny=ex/el;
  const mx=(E0[0]+E1[0])/2, my=(E0[1]+E1[1])/2;
  if((mx-face_centroid[0])*nx+(my-face_centroid[1])*ny < 0){ nx=-nx; ny=-ny; }
  const h=hOverride!=null?hOverride:Math.min(TAB_H, el*0.35);
  return [mx+nx*h*0.55, my+ny*h*0.55];
}

// 무료 폰트(Noto Sans KR, SIL OFL)를 사용 글자만 서브셋해 임베드. 파일 없으면 설치된 무료 폰트로 폴백.
const FONT = "'JurengguKR','Noto Sans KR','NanumGothic',sans-serif";
const B64_PATH = path.join(__dirname, 'font_subset.b64');
const FONT_B64 = fs.existsSync(B64_PATH) ? fs.readFileSync(B64_PATH, 'utf8').trim() : '';
const FONT_FACE = FONT_B64
  ? `@font-face{font-family:'JurengguKR';src:url(data:font/woff2;base64,${FONT_B64}) format('woff2');font-weight:400 800;font-display:swap;}`
  : '';

let svgPages=[];
pages.forEach((pg,pi)=>{
  let el=[];
  // 헤더 (제목 + 범례 2줄) — 스케일 그룹 바깥(고정 크기)
  el.push(`<text x="${MARGIN}" y="${MARGIN+5}" font-size="8" font-weight="700" fill="#000" font-family="${FONT}">Juryeonggu (酒令具) 14-Face Papercraft — Page ${pi+1}/${pages.length}</text>`);
  el.push(`<text x="${MARGIN}" y="${MARGIN+11}" font-size="5" fill="#333" font-family="${FONT}">Solid line = cut   ·   Dashed line = fold inward</text>`);
  el.push(`<text x="${MARGIN}" y="${MARGIN+16.5}" font-size="5" fill="#333" font-family="${FONT}">Gray tab = glue flap (glue tabs with the same number together)</text>`);

  // 레이어별로 그림 → 자르는 선(cut)이 절대 다른 면/탭에 가려지지 않게
  const L_tab=[], L_poly=[], L_line=[], L_num=[], L_text=[];
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for(const it of pg.items){
    const fis=compFaces(it.cid);
    const tx=it.x, ty=it.y;
    for(const fi of fis){
      const f=faces[fi];
      const pts=placed[fi].pts.map(p=>[p[0]+tx, p[1]+ty]);
      const cen=centroid(pts);
      pts.forEach(p=>{minx=Math.min(minx,p[0]);miny=Math.min(miny,p[1]);maxx=Math.max(maxx,p[0]);maxy=Math.max(maxy,p[1]);});
      // (1) 탭: 회색 채움 + 바깥 3변은 자르기 실선
      f.vi.forEach((_,e)=>{
        const info=faceEdgeInfo[fi][e];
        if(info.type==='seam'&&info.tab){
          const E0=pts[e], E1=pts[(e+1)%pts.length];
          L_tab.push(`<path d="${tabPath(E0,E1,cen,info.tabInset,info.tabH)}" fill="#ededed" stroke="#000" stroke-width="0.4" stroke-linejoin="round"/>`);
        }
      });
      // (2) 면 흰색 채우기
      const dpoly=pts.map(p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
      L_poly.push(`<polygon points="${dpoly}" fill="#fff" stroke="none"/>`);
      // (3) 모서리 선: 접기=점선, 자르기=실선. 탭이 달린 변은 '접기(점선)'
      f.vi.forEach((_,e)=>{
        const info=faceEdgeInfo[fi][e];
        const E0=pts[e], E1=pts[(e+1)%pts.length];
        const isFold = info.type==='fold' || (info.type==='seam'&&info.tab); // 탭 밑변=접기
        const dash= isFold ? 'stroke-dasharray="2 1.5"' : '';
        const sw= isFold ? 0.35 : 0.55;
        L_line.push(`<line x1="${E0[0].toFixed(2)}" y1="${E0[1].toFixed(2)}" x2="${E1[0].toFixed(2)}" y2="${E1[1].toFixed(2)}" stroke="#000" stroke-width="${sw}" ${dash}/>`);
        // (4) 심 번호
        if(info.type==='seam'){
          let lx,ly;
          if(info.tab){ const tc=tabCenter(E0,E1,cen,info.tabH); lx=tc[0]; ly=tc[1]; }
          else { const mx=(E0[0]+E1[0])/2, my=(E0[1]+E1[1])/2; const inx=cen[0]-mx, iny=cen[1]-my, il=Math.hypot(inx,iny)||1; lx=mx+inx/il*3.2; ly=my+iny/il*3.2; }
          L_num.push(`<text x="${lx.toFixed(2)}" y="${(ly+1).toFixed(2)}" font-size="3.2" fill="#000" text-anchor="middle" font-weight="700" font-family="${FONT}">${info.no}</text>`);
        }
      });
      // (5) 한자(고증 세로쓰기: 각 열 위→아래, 열은 오른쪽→왼쪽) + 영문
      // 면의 '위쪽'(FACE_UP)이 페이지 위에서 어느 방향인지 구해 글자 블록을 통째로 회전.
      // 이 회전이 있어야 접었을 때 각 면의 글자 방향이 실물과 같아진다.
      const pageUp=rot2(f.upLocal, placed[fi].ang);
      const rotDeg=Math.atan2(pageUp[0], -pageUp[1])*180/Math.PI; // SVG 기준 텍스트 위쪽=(0,-1)
      L_text.push(`<g transform="rotate(${rotDeg.toFixed(3)} ${cen[0].toFixed(2)} ${cen[1].toFixed(2)})">`);
      const hanja=[...f.rule.hanja], N=hanja.length;
      const cols=N<=1?1:2, rows=Math.ceil(N/cols);      // 실물 주사위: 최대 2열(오른쪽 ⌈N/2⌉자)
      // 글자 폭은 페이지 x축이 아니라 '글자 기준 가로축'으로 재야 회전해도 안 삐져나온다
      const rightAx=[-pageUp[1], pageUp[0]];
      let fxmin=Infinity,fxmax=-Infinity;
      pts.forEach(p=>{const d=(p[0]-cen[0])*rightAx[0]+(p[1]-cen[1])*rightAx[1]; fxmin=Math.min(fxmin,d); fxmax=Math.max(fxmax,d);});
      const usableW=(fxmax-fxmin)*0.80;
      const baseFS=f.type==='sq'?7.0:6.2;
      const cell=Math.max(4.0, Math.min(baseFS, usableW/cols));
      const gridH=rows*cell, gx0=cen[0]-(cols*cell)/2+cell/2, topY=cen[1]-gridH/2-1.5;
      for(let i=0;i<N;i++){
        const col=Math.floor(i/rows), r=i%rows;             // col 0=오른쪽 열, 각 열 위→아래
        const tx=gx0+(cols-1-col)*cell, ty=topY+r*cell+cell/2;
        L_text.push(`<text x="${tx.toFixed(2)}" y="${(ty+cell*0.35).toFixed(2)}" font-size="${cell.toFixed(2)}" fill="#000" text-anchor="middle" font-family="${FONT}" font-weight="600">${hanja[i]}</text>`);
      }
      const en=f.rule.en;
      const words=en.split(' '); const lines=[]; let cur='';
      const maxc = f.type==='sq'?16:20;
      for(const w of words){ if((cur+' '+w).trim().length>maxc){ lines.push(cur.trim()); cur=w; } else cur+=' '+w; }
      if(cur.trim()) lines.push(cur.trim());
      const enY0=topY+gridH+2.8;
      lines.forEach((ln,li)=>{
        L_text.push(`<text x="${cen[0].toFixed(2)}" y="${(enY0+li*3.2).toFixed(2)}" font-size="2.9" fill="#000" text-anchor="middle" font-family="${FONT}">${ln.replace(/&/g,'&amp;').replace(/'/g,'&#39;')}</text>`);
      });
      L_text.push(`</g>`);
    }
  }
  // ---------- 페이지 콘텐츠를 usable 영역에 맞춰 확대 + 중앙 배치 (요청 2) ----------
  const bbM=TAB_H+1.5; minx-=bbM; miny-=bbM; maxx+=bbM; maxy+=bbM;
  const bbW=maxx-minx, bbH=maxy-miny;
  const areaX=MARGIN, areaY=MARGIN+HEADER, areaW=PAGE_W-2*MARGIN, areaH=PAGE_H-MARGIN-(MARGIN+HEADER);
  const s=Math.min(areaW/bbW, areaH/bbH, 1.8); // 과확대 방지 상한
  const gx=areaX+(areaW-bbW*s)/2 - minx*s;
  const gy=areaY+(areaH-bbH*s)/2 - miny*s;
  el.push(`<g transform="translate(${gx.toFixed(3)},${gy.toFixed(3)}) scale(${s.toFixed(4)})">`);
  el.push(...L_tab, ...L_poly, ...L_line);
  el.push(`<g class="asm-num">`, ...L_num, `</g>`); // 조립 번호 그룹 (요청 4: 토글로 숨김 가능)
  el.push(...L_text);
  el.push(`</g>`);
  svgPages.push(`<svg class="page" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>
  ${el.join('\n  ')}
  </svg>`);
});

const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>Juryeonggu 14-Face Papercraft</title>
<style>
  ${FONT_FACE}
  @page { size: A4; margin: 0; }
  html,body{margin:0;padding:0;background:#fff;}
  .page{display:block; page-break-after:always; margin:0 auto;}
  .page:last-child{page-break-after:auto;}
  body.hide-num .asm-num{display:none;}      /* 조립 번호 숨김 (요청 4) */
  .toolbar{position:sticky;top:0;z-index:10;background:#222;color:#fff;padding:10px 16px;font-family:${FONT};font-size:14px;display:flex;gap:16px;align-items:center;box-shadow:0 2px 6px rgba(0,0,0,.3);}
  .toolbar label{cursor:pointer;user-select:none;}
  .toolbar button{font:inherit;padding:5px 14px;border:0;border-radius:5px;background:#4a90d9;color:#fff;cursor:pointer;}
  .toolbar button:hover{background:#3a7bc0;}
  @media screen { body{background:#888;} .page{margin:12px auto; box-shadow:0 2px 12px rgba(0,0,0,.4);} }
  @media print { .toolbar{display:none !important;} }
</style></head><body>
<div class="toolbar no-print">
  <label><input type="checkbox" id="togNum" checked> Show assembly numbers</label>
  <span style="opacity:.7">Uncheck, then print for a number-free copy</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
${svgPages.join('\n')}
<script>
  var t=document.getElementById('togNum');
  t.addEventListener('change',function(e){ document.body.classList.toggle('hide-num', !e.target.checked); });
</script>
</body></html>`;

const outDir=process.argv.slice(2).find(a=>!a.startsWith('--'))||'.'; // 플래그는 경로로 오해하지 않게
const outName = MAX_FACES>7 ? 'juryeonggu_papercraft_single.html' : 'juryeonggu_papercraft.html';
fs.writeFileSync(path.join(outDir,outName), html, 'utf8');
console.log('output:', outName);
console.log('components:', comps.length, '| pages:', pages.length, '| seams:', seamCounter);
console.log('comp face counts:', comps.map(c=>compFaces(c.id).length).join(', '));
const USE_W=PAGE_W-2*MARGIN, USE_H=PAGE_H-MARGIN-(MARGIN+HEADER);
compData.forEach(cd=>{
  const fitW=cd.w<=USE_W, fitH=cd.h<=USE_H;
  console.log(`  comp#${cd.id}: ${cd.w.toFixed(1)} x ${cd.h.toFixed(1)} mm  fitW=${fitW} fitH=${fitH} (usable ${USE_W}x${USE_H.toFixed(0)})`);
});
// 심 번호가 서로 짝을 이루는지(각 번호 정확히 2회) 검증
const seamPairCheck={};
faces.forEach((f,fi)=>faceEdgeInfo[fi].forEach(inf=>{ if(inf.type==='seam'){ seamPairCheck[inf.no]=(seamPairCheck[inf.no]||0)+1; }}));
const bad=Object.entries(seamPairCheck).filter(([n,c])=>c!==2);
console.log('seam pairing OK:', bad.length===0, bad.length?('bad:'+JSON.stringify(bad)):'');
// 각 컴포넌트의 접기(fold) 엣지 수 = 면수-1 이어야 완전 연결(모든 조각이 접힘으로 연결)
comps.forEach(c=>{
  const fis=compFaces(c.id);
  let folds=0;
  fis.forEach(fi=>faceEdgeInfo[fi].forEach(inf=>{ if(inf.type==='fold') folds++; }));
  folds/=2; // 양쪽 면에서 카운트됨
  console.log(`  comp#${c.id}: faces=${fis.length} folds=${folds} connected=${folds===fis.length-1}`);
});
console.log('C =', C.toFixed(5), '| square side mm =', (Math.SQRT2*UNIT_MM).toFixed(1),
  '| hex short mm =', (Math.SQRT2*(C-1)*UNIT_MM).toFixed(1));

// ---------- 탭이 면/다른 탭과 실제로 겹치는지 점검 ----------
let tabHits=0;
comps.forEach(c=>{
  const fis=compFaces(c.id); const tabs=[];
  fis.forEach(fi=>faceEdgeInfo[fi].forEach((inf,e)=>{ if(inf.type==='seam'&&inf.tab) tabs.push({fi,no:inf.no,quad:tabQuad(placed[fi].pts,e,inf.tabInset,inf.tabH)}); }));
  tabs.forEach(t=>fis.forEach(fi=>{ if(fi!==t.fi && convexOverlap(t.quad,placed[fi].pts,0.15)){ console.log(`  [탭겹침] 탭#${t.no} ↔ 면 ${faces[fi].rule.hanja}`); tabHits++; }}));
  for(let i=0;i<tabs.length;i++)for(let j=i+1;j<tabs.length;j++) if(convexOverlap(tabs[i].quad,tabs[j].quad,0.15)){ console.log(`  [탭겹침] 탭#${tabs[i].no} ↔ 탭#${tabs[j].no}`); tabHits++; }
});
console.log('tab overlaps:', tabHits);
