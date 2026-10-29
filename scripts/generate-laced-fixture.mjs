import {writeFile} from 'node:fs/promises';
import {Input,FilePathSource,ALL_FORMATS,EncodedPacketSink} from 'mediabunny';
function size(value){for(let width=1;width<=8;width++){if(BigInt(value)<(1n<<BigInt(width*7))-1n){let bits=BigInt(value)|(1n<<BigInt(width*7));const result=Buffer.alloc(width);for(let i=width-1;i>=0;i--){result[i]=Number(bits&255n);bits>>=8n;}return result;}}throw new Error('Too large');}
const unsigned=value=>{let hex=BigInt(value).toString(16);if(hex.length%2)hex='0'+hex;return Buffer.from(hex,'hex');};
const float=value=>{const data=Buffer.alloc(8);data.writeDoubleBE(value);return data;};
const element=(id,data)=>{const bytes=Buffer.concat(Array.isArray(data)?data:[Buffer.from(data)]);return Buffer.concat([Buffer.from(id,'hex'),size(bytes.length),bytes]);};
const number=(id,value)=>element(id,unsigned(value));
const input=new Input({source:new FilePathSource('tests/fixtures/tone.opus'),formats:ALL_FORMATS});
try{
 const track=await input.getPrimaryAudioTrack();const config=await track.getDecoderConfig();const packets=[];for await(const packet of new EncodedPacketSink(track).packets())packets.push(Buffer.from(packet.data));
 const blocks=[];let index=0;
 while(index<packets.length){
  const count=index===0?1:Math.min(2,packets.length-index);const group=packets.slice(index,index+count);const header=Buffer.alloc(4);header[0]=0x81;header.writeInt16BE(index*20,1);header[3]=count>1?2:0;
  const lacing=[];if(count>1){lacing.push(Buffer.from([count-1]));for(const packet of group.slice(0,-1)){let length=packet.length;while(length>=255){lacing.push(Buffer.from([255]));length-=255;}lacing.push(Buffer.from([length]));}}
  const children=[element('a1',Buffer.concat([header,...lacing,...group])),number('9b',count*20)];
  if(index+count===packets.length)children.push(element('75a2',Buffer.concat([Buffer.from([0]),unsigned(13500000)])));
  blocks.push(element('a0',children));index+=count;
 }
 const ebml=element('1a45dfa3',[number('4286',1),number('42f7',1),number('42f2',4),number('42f3',8),element('4282',Buffer.from('matroska')),number('4287',4),number('4285',2)]);
 const info=element('1549a966',[number('2ad7b1',1000000),element('4489',float(2020)),element('4d80',Buffer.from('Audio Toolkit synthetic fixture')),element('5741',Buffer.from('Audio Toolkit'))]);
 const audio=element('e1',[element('b5',float(48000)),number('9f',2)]);
 const entry=element('ae',[number('d7',1),number('73c5',1),number('83',2),number('9c',1),number('23e383',20000000),element('86',Buffer.from('A_OPUS')),element('63a2',new Uint8Array(config.description)),number('56aa',6500000),number('56bb',80000000),audio]);
 const cluster=element('1f43b675',[number('e7',0),...blocks]);
 await writeFile('tests/fixtures/laced-opus.mka',Buffer.concat([ebml,element('18538067',[info,element('1654ae6b',entry),cluster])]));
 console.log(`Generated ${packets.length} valid Opus frames with a laced final BlockGroup and 648 discarded samples.`);
}finally{input.dispose();}
