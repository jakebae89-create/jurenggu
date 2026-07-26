// 벌칙↔면 배정 솔버 — 실행: node solve_assignment.js
//
// 실물 전개도 사진에서 읽어낸 "이 벌칙과 저 벌칙이 맞닿아 있다" 제약만 주면,
// 14면체의 고정된 인접 구조에 그 제약을 만족시키는 배정을 전부 찾아준다.
// 제약이 충분하면 해가 (회전/거울 대칭을 빼고) 하나로 좁혀진다.
//
// 사용법: OBSERVED에 사진에서 확인한 인접 쌍을 추가하고 다시 실행.

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
const eq=(a,b)=>Math.abs(a-b)<1e-6;
const vidx=v=>VERTS.findIndex(w=>eq(w[0],v[0])&&eq(w[1],v[1])&&eq(w[2],v[2]));
const squareFaceVerts=c=>{const ai=c.findIndex(x=>x!==0); return VERTS.filter(v=>eq(v[ai],c[ai]));};
const hexFaceVerts=c=>{const [sx,sy,sz]=c; return VERTS.filter(v=> v[0]*sx>=-1e-9 && v[1]*sy>=-1e-9 && v[2]*sz>=-1e-9);};

// 면 꼭짓점을 바깥에서 봤을 때 반시계 순으로 정렬 (check_face_up.js·build_papercraft.js와 동일 규칙)
function orderFace(verts, normal){
  const c=scale(verts.reduce((a,v)=>add(a,v),[0,0,0]),1/verts.length);
  const n=norm(normal), u=norm(sub(verts[0],c)), w=cross(n,u);
  return verts.map(v=>{const d=sub(v,c); return {v,ang:Math.atan2(dot(d,w),dot(d,u))};})
              .sort((a,b)=>a.ang-b.ang).map(o=>o.v);
}
// 면 슬롯: 0..5 = 사각, 6..13 = 육각
const slots=[];
SQUARE_CENTERS.forEach(c=>slots.push({type:'sq', vi:orderFace(squareFaceVerts(c),c).map(vidx)}));
HEX_CENTERS.forEach(c=>slots.push({type:'hex', vi:orderFace(hexFaceVerts(c),c).map(vidx)}));

// 슬롯별 '바깥에서 본 반시계' 이웃 슬롯 순서 (거울상 판별에 필요)
const edgeMap=new Map();
slots.forEach((s,si)=>{const n=s.vi.length;for(let e=0;e<n;e++){
  const a=s.vi[e], b=s.vi[(e+1)%n], k=a<b?`${a},${b}`:`${b},${a}`;
  if(!edgeMap.has(k)) edgeMap.set(k,[]);
  edgeMap.get(k).push(si);
}});
const ccwNeighbors=slots.map((s,si)=>{
  const n=s.vi.length, out=[];
  for(let e=0;e<n;e++){
    const a=s.vi[e], b=s.vi[(e+1)%n], k=a<b?`${a},${b}`:`${b},${a}`;
    out.push(edgeMap.get(k).find(t=>t!==si));
  }
  return out;
});

// 슬롯 간 인접 (모서리=꼭짓점 2개 공유)
const N=slots.length;
const adjacent=Array.from({length:N},()=>new Array(N).fill(false));
for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){
  const shared=slots[i].vi.filter(v=>slots[j].vi.includes(v)).length;
  if(shared===2){ adjacent[i][j]=adjacent[j][i]=true; }
}

// ---------------- 사진에서 읽은 제약 ----------------
// 맞닿아 있는 벌칙 쌍 (2026-07-26 목제주령구 전개도 크롭에서 판독)
const OBSERVED = [
  // 중앙 크롭
  ['禁聲作儛','曲臂則盡'],   // 위
  ['禁聲作儛','任意請歌'],   // 오른쪽 (사용자 확인)
  ['禁聲作儛','醜物莫放'],   // 아래
  ['禁聲作儛','空詠詩過'],   // 왼쪽
  // 오른쪽 절반 크롭
  ['任意請歌','自唱自飮'],
  ['任意請歌','曲臂則盡'],
  ['任意請歌','飮盡大咲'],
  ['任意請歌','兩盞則放'],
  ['自唱自飮','月鏡一曲'],
  ['自唱自飮','曲臂則盡'],
  ['兩盞則放','有犯空過'],
  ['兩盞則放','弄面孔過'],
  ['兩盞則放','飮盡大咲'],
  ['有犯空過','弄面孔過'],
  // 왼쪽 절반 크롭
  ['空詠詩過','衆人打鼻'],
  ['空詠詩過','三盞一去'],
  ['空詠詩過','醜物莫放'],
  ['三盞一去','醜物莫放'],
];
// 면 유형이 확실한 것만 (변 4개가 뚜렷이 보인 면)
const TYPE = {
  '禁聲作儛':'sq',   // 중앙 크롭에서 명확
  '有犯空過':'sq',   // 오른쪽 크롭 끝, 명확
  '衆人打鼻':'sq',
};
// ⚠️ 방향(거울상) 제약 — 인접 쌍만으로는 좌우 반전을 구분할 수 없다.
// 위 OBSERVED는 "누구와 누가 맞닿는가"만 담고 있어서 실물과 거울상인 배정도 똑같이 통과한다
// (그래서 해가 48개 = 회전 24 × 거울 2 로 나왔던 것).
// 아래는 전개도에서 한 면의 이웃을 '바깥에서 봤을 때 반시계 방향' 순서로 적은 것.
// 목제주령구 전개도(자료/주령구 전개도.jpg) 중앙의 禁聲作儛 사각면 기준:
//   위=曲臂則盡, 왼쪽=空詠詩過, 아래=醜物莫放, 오른쪽=任意請歌 → 화면에서 반시계 = 위→왼→아래→오른
const ORIENTED = { '禁聲作儛': ['曲臂則盡','空詠詩過','醜物莫放','任意請歌'] };
// ----------------------------------------------------

const LABELS=['禁聲作儛','衆人打鼻','飮盡大咲','三盞一去','有犯空過','自唱自飮',
              '曲臂則盡','弄面孔過','任意請歌','月鏡一曲','空詠詩過','兩盞則放','醜物莫放','自唱怪來晚'];
const li=new Map(LABELS.map((l,i)=>[l,i]));
// 라벨별 제약 이웃
const need=LABELS.map(()=>[]);
for(const [a,b] of OBSERVED){
  if(!li.has(a)||!li.has(b)) throw new Error('알 수 없는 라벨: '+a+'/'+b);
  need[li.get(a)].push(li.get(b)); need[li.get(b)].push(li.get(a));
}
// 제약 많은 라벨부터 배치 (가지치기 효율)
const order=[...LABELS.keys()].sort((a,b)=>need[b].length-need[a].length);

const assign=new Array(LABELS.length).fill(-1); // label -> slot
const used=new Array(N).fill(false);
let solutions=[];
function bt(k){
  if(solutions.length>200) return;           // 폭주 방지
  if(k===order.length){ solutions.push(assign.slice()); return; }
  const L=order[k];
  for(let s=0;s<N;s++){
    if(used[s]) continue;
    if(TYPE[LABELS[L]] && TYPE[LABELS[L]]!==slots[s].type) continue;
    // 이미 배치된 제약 이웃과 실제로 인접해야 함
    let ok=true;
    for(const nb of need[L]){
      if(assign[nb]!==-1 && !adjacent[s][assign[nb]]){ ok=false; break; }
    }
    if(!ok) continue;
    // 배치 안 된 제약 이웃을 수용할 빈 이웃 슬롯이 남아 있는지 (약한 가지치기)
    const pending=need[L].filter(nb=>assign[nb]===-1).length;
    let free=0;
    for(let t=0;t<N;t++) if(adjacent[s][t]&&!used[t]) free++;
    if(free<pending) continue;

    assign[L]=s; used[s]=true;
    bt(k+1);
    assign[L]=-1; used[s]=false;
  }
}
bt(0);

const rawCount=solutions.length;
// 방향 제약으로 거울상 해를 걸러낸다
function keepsOrientation(sol){
  for(const [label, cycle] of Object.entries(ORIENTED)){
    const slot=sol[li.get(label)];
    const model=ccwNeighbors[slot].map(s=>LABELS[sol.findIndex(x=>x===s)]);
    // 관측 순서가 모델 반시계 순서의 회전(cyclic rotation)인지
    const start=model.indexOf(cycle[0]);
    if(start<0) return false;
    for(let i=0;i<cycle.length;i++){
      if(model[(start+i)%model.length]!==cycle[i]) return false;
    }
  }
  return true;
}
const mirrored=solutions.filter(s=>!keepsOrientation(s)).length;
solutions=solutions.filter(keepsOrientation);

console.log(`제약: 인접쌍 ${OBSERVED.length}개, 유형고정 ${Object.keys(TYPE).length}개, 방향고정 ${Object.keys(ORIENTED).length}개`);
console.log(`해의 개수: ${rawCount}${rawCount>200?'+ (상한 도달)':''} → 방향 제약 통과 ${solutions.length}개 (거울상 ${mirrored}개 제외)`);

if(solutions.length===0){
  console.log('\n❌ 해가 없습니다 — 판독한 인접 관계 중 하나 이상이 잘못됐다는 뜻입니다.');
} else {
  // 모든 해에서 공통인 인접 관계 = 사진 없이도 확정된 사실
  const first=solutions[0];
  const pairSets=solutions.map(sol=>{
    const s=new Set();
    for(let a=0;a<LABELS.length;a++) for(let b=a+1;b<LABELS.length;b++)
      if(adjacent[sol[a]][sol[b]]) s.add(a+','+b);
    return s;
  });
  const common=[...pairSets[0]].filter(p=>pairSets.every(s=>s.has(p)));
  console.log(`\n모든 해에서 공통인 인접쌍: ${common.length}개 (14면체 전체 인접쌍은 36개)`);
  console.log('→ 이 값들은 추가 사진 없이도 확정된 것.');

  console.log('\n--- 해 #1의 배정 (사각/육각) ---');
  LABELS.forEach((l,i)=>{
    console.log('  '+l.padEnd(9)+(slots[first[i]].type==='sq'?'사각':'육각')+'  slot'+first[i]);
  });
  if(solutions.length>1){
    console.log(`\n⚠️ 해가 ${solutions.length}개 — 아직 정보가 부족합니다.`);
    // 어느 라벨이 아직 흔들리는지
    const varies=LABELS.map((l,i)=>({l, n:new Set(solutions.map(s=>s[i])).size}))
                       .filter(x=>x.n>1).sort((a,b)=>b.n-a.n);
    console.log('아직 위치가 확정 안 된 면 (가능한 위치 수):');
    varies.forEach(v=>console.log(`  ${v.l.padEnd(9)}${v.n}곳`));
  } else {
    console.log('\n✅ 해가 유일합니다 — 배정 확정!');
  }

  // 인접 구조가 모든 해에서 같으면(=36쌍 공통) 배정은 대칭을 빼고 확정된 것.
  if(common.length===36){
    console.log('\n✅ 모든 해의 인접 구조가 동일 = 배정 확정 (해 48개는 주사위 자체의 대칭)');
    const sol=first;
    const slotOf=l=>sol[li.get(l)];
    console.log('\n--- 코드에 넣을 순서 (slot 순으로 정렬) ---');
    const sq=LABELS.filter(l=>slots[slotOf(l)].type==='sq').sort((a,b)=>slotOf(a)-slotOf(b));
    const hx=LABELS.filter(l=>slots[slotOf(l)].type==='hex').sort((a,b)=>slotOf(a)-slotOf(b));
    console.log('SQUARE_RULES 순서:', sq.join(', '));
    console.log('HEX_RULES 순서   :', hx.join(', '));

    console.log('\n--- 확정된 면별 이웃 ---');
    for(const l of LABELS){
      const s=slotOf(l), nb=LABELS.filter(o=>o!==l && adjacent[s][slotOf(o)]);
      console.log('  '+l.padEnd(9)+(slots[s].type==='sq'?'사각':'육각')+'  '+nb.join(', '));
    }
    console.log('\n--- 사진 판독 제약이 실제로 지켜졌는지 ---');
    let allOk=true;
    for(const [a,b] of OBSERVED){
      const ok=adjacent[slotOf(a)][slotOf(b)];
      if(!ok){ allOk=false; console.log(`  ❌ ${a} ↔ ${b}`); }
    }
    console.log(allOk?'  ✅ 18개 제약 전부 만족':'  ❌ 위 항목 불만족');
  }
}
