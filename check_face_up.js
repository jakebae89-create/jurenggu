// FACE_UP 검증기 — 실행: node check_face_up.js
//
// FACE_UP(면별 글자 '위쪽'이 향하는 이웃 면)을 수정한 뒤 반드시 돌릴 것.
// 확인 항목:
//   1) 지정한 대상이 실제로 그 면의 이웃인가 (오타/비인접 지정 잡아냄)
//   2) build_papercraft.js(엣지맵 방식)와 index.html(공유 꼭짓점 방식)이 같은 결과를 내는가
//   3) 사각면 글자축이 변에 정렬됐는가 (꼭짓점 방향 45° 틀어짐 방지)
//
// ※ 아래 FACE_UP은 검증용 사본이다. build_papercraft.js / index.html 의 FACE_UP과
//   항상 같은 값으로 유지할 것 (세 곳 모두 동일해야 함).
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const norm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l];};
const B=1, C=-1+Math.sqrt(3+4/Math.sqrt(3));
function buildVertices(){
  const mags=[0,B,C];
  const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const seen=new Set(), out=[];
  for(const p of perms) for(let sx=-1;sx<=1;sx+=2) for(let sy=-1;sy<=1;sy+=2) for(let sz=-1;sz<=1;sz+=2){
    const v=[mags[p[0]]*sx, mags[p[1]]*sy, mags[p[2]]*sz];
    const k=v.map(x=>x.toFixed(6)).join(',');
    if(!seen.has(k)){ seen.add(k); out.push(v); }
  }
  return out;
}
const VERTS=buildVertices();
const SQUARE_CENTERS=[[C,0,0],[-C,0,0],[0,C,0],[0,-C,0],[0,0,C],[0,0,-C]];
const HEX_CENTERS=[[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]];
const SQ=['禁聲作儛','有犯空過','飮盡大咲','衆人打鼻','自唱自飮','三盞一去'];
const HX=['任意請歌','醜物莫放','曲臂則盡','空詠詩過','兩盞則放','弄面孔過','月鏡一曲','自唱怪來晚'];
const FACE_UP = {
  '禁聲作儛':'曲臂則盡','有犯空過':'月鏡一曲','自唱自飮':'兩盞則放','三盞一去':'空詠詩過',
  '飮盡大咲':'醜物莫放','衆人打鼻':'空詠詩過',
  '任意請歌':'曲臂則盡','曲臂則盡':'禁聲作儛','醜物莫放':'禁聲作儛','空詠詩過':'醜物莫放',
  '兩盞則放':'月鏡一曲','月鏡一曲':'曲臂則盡','弄面孔過':'有犯空過','自唱怪來晚':'月鏡一曲',
};
const eq=(a,b)=>Math.abs(a-b)<1e-6;
function vidx(v){ return VERTS.findIndex(w=>eq(w[0],v[0])&&eq(w[1],v[1])&&eq(w[2],v[2])); }
function squareFaceVerts(c){ const ai=c.findIndex(x=>x!==0); return VERTS.filter(v=>eq(v[ai],c[ai])); }
function hexFaceVerts(c){ const [sx,sy,sz]=c; return VERTS.filter(v=> v[0]*sx>=-1e-9 && v[1]*sy>=-1e-9 && v[2]*sz>=-1e-9); }
function orderFace(verts, normal){
  const c=scale(verts.reduce((a,v)=>add(a,v),[0,0,0]),1/verts.length);
  const n=norm(normal), u=norm(sub(verts[0],c)), w=cross(n,u);
  return verts.map(v=>{const d=sub(v,c); return {v,ang:Math.atan2(dot(d,w),dot(d,u))};})
              .sort((a,b)=>a.ang-b.ang).map(o=>o.v);
}
let faces=[];
SQUARE_CENTERS.forEach((c,i)=>faces.push({label:SQ[i],type:'sq',normal:norm(c),vi:orderFace(squareFaceVerts(c),c).map(vidx)}));
HEX_CENTERS.forEach((c,i)=>faces.push({label:HX[i],type:'hex',normal:norm(c),vi:orderFace(hexFaceVerts(c),c).map(vidx)}));
faces.forEach(f=>{ f.cen=scale(f.vi.map(i=>VERTS[i]).reduce((a,v)=>add(a,v),[0,0,0]),1/f.vi.length); });
const byLabel=new Map(faces.map(f=>[f.label,f]));

// A: 엣지맵 방식 (build_papercraft.js)
const edgeMap=new Map();
faces.forEach((f,fi)=>{const n=f.vi.length;for(let e=0;e<n;e++){const a=f.vi[e],b=f.vi[(e+1)%n];const k=a<b?`${a},${b}`:`${b},${a}`;if(!edgeMap.has(k))edgeMap.set(k,[]);edgeMap.get(k).push({fi,ei:e});}});
function upEdgeMap(fi){
  const f=faces[fi], n=f.vi.length, want=FACE_UP[f.label];
  for(let e=0;e<n;e++){
    const a=f.vi[e],b=f.vi[(e+1)%n];const k=a<b?`${a},${b}`:`${b},${a}`;
    const other=edgeMap.get(k).find(p=>p.fi!==fi);
    if(faces[other.fi].label===want){
      return norm(sub(scale(add(VERTS[a],VERTS[b]),0.5), f.cen));
    }
  }
  return null;
}
// B: 공유 꼭짓점 방식 (index.html)
function upShared(fi){
  const f=faces[fi], want=FACE_UP[f.label], g=byLabel.get(want);
  const mine=f.vi.map(i=>VERTS[i]), theirs=g.vi.map(i=>VERTS[i]);
  const shared=mine.filter(a=>theirs.some(b=>eq(a[0],b[0])&&eq(a[1],b[1])&&eq(a[2],b[2])));
  if(shared.length!==2) return {err:`공유 꼭짓점 ${shared.length}개`};
  return {v:norm(sub(scale(add(shared[0],shared[1]),0.5), f.cen))};
}
console.log('면'.padEnd(9)+'유형'.padEnd(6)+'FACE_UP 대상'.padEnd(14)+'두 방식 각도차');
console.log('-'.repeat(60));
let bad=0;
faces.forEach((f,fi)=>{
  const A=upEdgeMap(fi), Bv=upShared(fi);
  if(!A){ console.log(f.label.padEnd(9)+f.type.padEnd(6)+FACE_UP[f.label].padEnd(14)+'❌ 이웃이 아님'); bad++; return; }
  if(Bv.err){ console.log(f.label.padEnd(9)+f.type.padEnd(6)+FACE_UP[f.label].padEnd(14)+'❌ '+Bv.err); bad++; return; }
  const d=Math.acos(Math.max(-1,Math.min(1,dot(A,Bv.v))))*180/Math.PI;
  if(d>1e-3) bad++;
  console.log(f.label.padEnd(9)+f.type.padEnd(6)+FACE_UP[f.label].padEnd(14)+(d<1e-3?'✅ 0.000°':'❌ '+d.toFixed(4)+'°'));
});
console.log('-'.repeat(60));
console.log(bad===0 ? '✅ 14/14 일치 — 전개도와 3D가 동일한 면 방향을 씁니다.' : `❌ 불일치 ${bad}건`);

// 사각면이 변에 정렬됐는지(꼭짓점 45° 아님) 확인
console.log('\n사각면 글자축 검사 (변 정렬이어야 정상):');
faces.filter(f=>f.type==='sq').forEach(f=>{
  const fi=faces.indexOf(f), up=upEdgeMap(fi);
  const n=f.vi.length; let best=180;
  for(let e=0;e<n;e++){
    const a=f.vi[e],b=f.vi[(e+1)%n];
    const mid=scale(add(VERTS[a],VERTS[b]),0.5);
    const d=Math.acos(Math.max(-1,Math.min(1,dot(up,norm(sub(mid,f.cen))))))*180/Math.PI;
    best=Math.min(best,d);
  }
  console.log('  '+f.label.padEnd(9)+(best<1e-3?'✅ 변 정렬':'❌ '+best.toFixed(1)+'° 틀어짐'));
});

// --- 인접 관계 덤프: node check_face_up.js --adj ---
// 실물 사진과 대조할 때 사용 (사진에서 맞닿아 보이는 면이 모델에서도 이웃인지 확인)
if(process.argv.includes('--adj')){
  console.log('\n=== 면별 유형 · 이웃 (모델 기준) ===');
  faces.forEach((f,fi)=>{
    const n=f.vi.length, out=[];
    for(let e=0;e<n;e++){
      const a=f.vi[e],b=f.vi[(e+1)%n];const k=a<b?`${a},${b}`:`${b},${a}`;
      out.push(faces[edgeMap.get(k).find(p=>p.fi!==fi).fi].label);
    }
    console.log(`${f.label.padEnd(9)}${f.type==='sq'?'사각':'육각'}  이웃: ${out.join(', ')}`);
  });
}
