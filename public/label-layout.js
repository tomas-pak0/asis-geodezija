/* Pixel-space placement for point numbers; hidden labels are reconsidered on every map move. */
(function(root){
 'use strict';
 const intersects=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
 function place(items,obstacles,viewport){
  const occupied=[],result=[];
  for(const item of items){
   const {x,y,w,h}=item;
   const candidates=[
    {x:x+17,y:y-h/2,w,h},
    {x:x-17-w,y:y-h/2,w,h},
    {x:x-w/2,y:y-17-h,w,h},
    {x:x-w/2,y:y+17,w,h}
   ];
   const box=candidates.find(candidate=>candidate.x>=3&&candidate.y>=3&&candidate.x+candidate.w<=viewport.width-3&&candidate.y+candidate.h<=viewport.height-3
    &&!obstacles.some(o=>intersects(candidate,o))&&!occupied.some(o=>intersects(candidate,o)));
   if(box){occupied.push(box);result.push({...item,box})}
  }
  return result;
 }
 root.AsisLabelLayout={place};
})(typeof window!=='undefined'?window:globalThis);
