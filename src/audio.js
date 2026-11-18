import { createRng } from './game/rng.js';

const pent = [0,2,4,7,9];
const songs = [[0,2,4,2,1,0,2,3,4,3,2,1,0,2,1,0], [2,2,3,4,2,1,0,2,3,2,4,3,2,1,2,0], [0,1,3,4,3,1,2,0,2,3,1,0,1,2,1,0]];
const pitch = note => 2 ** (note/12);
const voices = { bumper:'drum', sling:'crackle', drop:'wood', standup:'wood', lane:'chime', saucer:'gong', inlane:'chime', post:'wood' };

export function createAudio(settings, isMuted) {
  let audio, main, effects, music, noise, bustle, timer, playing=false, street=0, step=0, drum=0, lastDrum=-1;
  let active=0;
  const last=new Map(), rng=createRng(0xfae871a);
  function tone(channel, freq, end, amp, duration, type='sine', delay=0) {
    if(!audio||audio.state!=='running'||active>=15)return;
    const now=audio.currentTime+delay, osc=audio.createOscillator(), gain=audio.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(25,end),now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(amp,now+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration+0.01);osc.connect(gain).connect(channel);
    active++;osc.onended=()=>{active--;osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+duration+.02);
  }
  function grit(amp,duration,hz=2200,delay=0) {
    if(!audio||audio.state!=='running'||active>=15)return;
    const source=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter(),now=audio.currentTime+delay;
    source.buffer=noise;filter.type='bandpass';filter.frequency.value=hz;filter.Q.value=.9;
    gain.gain.setValueAtTime(amp,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter).connect(gain).connect(effects);active++;
    source.onended=()=>{active--;source.disconnect();filter.disconnect();gain.disconnect();};source.start(now,rng()*.18);source.stop(now+duration+.01);
  }
  function musicBeat(){
    if(!playing||audio.state!=='running')return;
    const melody=songs[street]??songs[0], root=[294,330,247][street]??294;
    const n=melody[step%melody.length], f=root*pitch(pent[n]);
    tone(music,f,f*.997,.048,step%4===3?.35:.50,'sine');
    if(step%2===0)tone(music,f*2,f*2.004,.012,.23,'sine');
    if(step%4===0)tone(music,root*.5,root*.24,.033,.24,'triangle');
    step++;
  }
  function volumes() {
    if(!audio)return;
    main.gain.setTargetAtTime(isMuted?0:settings.volume,audio.currentTime,.04);
    effects.gain.setTargetAtTime(settings.effects,audio.currentTime,.04);
    music.gain.setTargetAtTime(settings.music,audio.currentTime,.06);
  }
  async function unlock() {
    if(isMuted)return;
    if(!audio){
      const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Audio)return;
      audio=new Audio();
      main=audio.createGain();effects=audio.createGain();music=audio.createGain();
      main.connect(audio.destination);effects.connect(main);music.connect(main);volumes();
      noise=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
      const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=rng()*2-1;
      bustle=audio.createBufferSource();bustle.buffer=noise;bustle.loop=true;
      const filter=audio.createBiquadFilter(),ambient=audio.createGain();filter.type='bandpass';filter.frequency.value=330;filter.Q.value=.8;
      ambient.gain.value=.052;bustle.connect(filter).connect(ambient).connect(music);bustle.start();
    }
    if(!playing)return;
    await audio.resume().catch(()=>{});
    if(playing&&!timer)timer=setInterval(musicBeat,street===1?385:street===2?535:455);
  }
  function pause(value) {
    playing=!value;
    if(!audio)return;
    if(value){clearInterval(timer);timer=null;void audio.suspend().catch(()=>{});}
    else void unlock();
  }
  function onEvent(ev) {
    if(!audio||!playing||audio.state!=='running')return;
    const name=ev.type==='hit'?(ev.kind==='dragon'?'gong':voices[ev.kind]):({ spinnerHalfTurn:'spinner', orbit:'chime', coins:'coin', multiplier:'gong',
      flip:'flip', launch:'launch', drain:'drain', targetReached:'finale', skillShot:'gong', multiballStart:'finale', tilt:'drain', bossPower:'finale' })[ev.type];
    if(!name)return;
    const now=audio.currentTime;
    if(now-(last.get(name)??-Infinity)<.025)return;
    last.set(name,now);
    if(name==='drum'){
      drum=now-lastDrum<1.5?(drum+1)%pent.length:0;lastDrum=now;
      tone(effects,180*pitch(pent[drum]),76,.22,.17);grit(.07,.07,680);
    } else if(name==='crackle'||name==='finale'){
      grit(.20,.10,2000);grit(.16,.14,1300,.064);grit(.13,.13,2900,.122);
      if(name==='finale')for(let i=0;i<3;i++)tone(effects,330*pitch(pent[i+1]),280*pitch(pent[i+1]),.16,.36,'triangle',i*.11);
    } else if(name==='gong'){
      tone(effects,323,294,.17,.46);tone(effects,531,500,.08,.38);tone(effects,931,818,.045,.35);
    } else if(name==='wood')tone(effects,430,220,.19,.10,'triangle');
    else if(name==='coin'){tone(effects,1100,935,.13,.18);tone(effects,1530,1300,.09,.26,'sine',.04);}
    else if(name==='chime')tone(effects,635,460,.12,.20,'triangle');
    else if(name==='spinner')tone(effects,800,490,.06,.057,'triangle');
    else if(name==='flip'){grit(.039,.042,490);tone(effects,95,45,.10,.080);}
    else if(name==='launch')tone(effects,180,480+(ev.speed??1500)*.18,.16,.20,'triangle');
    else if(name==='drain')tone(effects,330,56,.14,.30,'triangle');
    if(settings.vibration&&name==='flip')navigator.vibrate?.(10);
  }
  return { unlock,pause,volumes,onEvent, setStreet(index){if(street===index)return;street=index;step=0;if(playing&&audio){clearInterval(timer);timer=null;void unlock();}} };
}
