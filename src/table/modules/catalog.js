import { part,trialModules,topLanes,leftLanterns,centerDrums,rightSaucer,lowerLanterns,leftOrbit } from './trial.js';
import { ringsFour,leftSugar,sideWind } from '../rules.js';
const {spec,gate,round}=part;
const weighted=(mod,weight,clear=[],mirror=false)=>({...mod,weight:{default:1,...weight},keepClear:clear,mirror});
const top=(m,w)=>weighted(m,w,[[12,114,382,150]]);
const side=(m,w)=>weighted(m,w,[[0,270,160,300]],true);
const middle=(m,w)=>weighted(m,w,[[0,8,130,52]]);
const bottom=(m,w)=>weighted(m,w,[[44,0,76,120]]);
const outside=(m,w)=>weighted(m,w,[[194,722,326,830]]);
const group={group:'lanterns'};
const topGate=spec('top_festival_fan','top',[
  gate('lane','circle-a',6,29,116,64,{group:'circles'}),gate('lane','circle-b',139,29,120,64,{group:'circles'}),
  gate('lane','circle-c',278,29,113,64,{group:'circles'}),gate('spinner','fan',274,91,103,19),
]);
const topSugar=spec('top_small_sugar','top',[
  gate('lane','circle-a',15,31,108,75,{group:'circles'}),gate('lane','circle-b',146,31,110,75,{group:'circles'}),
  gate('lane','circle-c',271,31,110,75,{group:'circles'}),round('saucer','sugar',267,139,29,{angle:55}),
]);
const leftWide=spec('left_lantern_steps','left',[round('drop','lantern-a',70,58,14,group),round('drop','lantern-b',108,95,13,group),round('drop','lantern-c',79,137,13,group)]);
const leftLights=spec('left_fair_lights','left',[round('standup','light-a',70,172,13),round('standup','light-b',103,211,12)]);
const centerDrumsTwo=spec('center_drums_diag','center',[round('bumper','drum-a',35,111,24),round('bumper','drum-b',90,172,24)]);
const centerLights=spec('center_lantern_triplet','center',[round('drop','lantern-a',23,103,13,group),round('drop','lantern-b',65,130,13,group),round('drop','lantern-c',107,103,13,group)]);
const centerSugar=spec('center_sugar_drum','center',[round('saucer','sugar',66,168,34,{angle:48}),round('bumper','drum',65,97,24)]);
const centerTall=spec('center_high_drum','center',[round('bumper','drum',65,124,29),round('standup','light',65,209,16)]);
const rightFan=spec('right_double_fan','right',[gate('spinner','fan-a',38,108,84,57),gate('spinner','fan-b',39,217,88,36)]);
const lowerEmpty=spec('lower_empty','lower',[]);
const lowerBig=spec('lower_lights_far','lower',[round('standup','light-a',17,75,13),round('standup','light-b',103,75,13)]);
const wideOrbit={...leftOrbit,elements:leftOrbit.elements.map(e=>e.kind==='spinner'?{...e,h:57,w:77}:e)};
const orbitRight=spec('orbit_right','orbit',leftOrbit.elements.map(e=>({...e,x:520-e.x-e.w,
  ...(e.exit?{exit:{...e.exit,x:520-e.exit.x-e.exit.w}}:{})})));
const orbitDual=spec('orbit_double','orbit',[...wideOrbit.elements,...orbitRight.elements.map(e=>({...e,id:e.id+'-r'}))]);
const orbitNone=spec('orbit_empty','orbit',[]);
export const layoutModules=[
  top(topLanes,{drums:5,lanterns:4,variety:2}),top(ringsFour,{rings:15}),top(topGate,{wind:12}),top(topSugar,{sugar:8}),
  side(leftLanterns,{lanterns:12,rings:4}),side(leftWide,{lanterns:10,variety:4}),side(leftSugar,{sugar:18}),side(sideWind,{wind:14}),side(leftLights,{variety:5,drums:4}),
  middle(centerDrums,{drums:17,variety:3}),middle(centerDrumsTwo,{drums:12,rings:4,wind:4}),middle(centerLights,{lanterns:22}),middle(centerSugar,{sugar:6}),middle(centerTall,{wind:3,variety:6}),
  side(rightSaucer,{sugar:16,drums:6,lanterns:5,rings:5,wind:5,variety:6}),side(rightFan,{wind:12}),
  bottom(lowerLanterns,{lanterns:10}),bottom(lowerEmpty,{sugar:5,wind:5}),bottom(lowerBig,{variety:7,rings:5}),
  outside(wideOrbit,{wind:6,drums:5}),outside(orbitRight,{wind:6,rings:5}),outside(orbitDual,{wind:7}),outside(orbitNone,{lanterns:6,sugar:5,variety:5}),
];
export const fallbackModules=trialModules.map(m=>layoutModules.find(x=>x.id===m.id));
