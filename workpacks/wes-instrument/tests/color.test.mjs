import test from 'node:test';
import assert from 'node:assert/strict';
import {hexToRgb,rgbToHex,srgbToLinear,relativeLuminance,contrastRatio,passesContrast,
  hexToLab,deltaE76,mixHex,bestTextColor,deriveMode,auditRolePairs} from '../lib/color.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
test('six-digit RGB parsing and round trip',()=>{
 assert.deepEqual(hexToRgb('#Ab01ef'),[171,1,239]);assert.equal(rgbToHex([171,1,239]),'#AB01EF');
});
test('invalid hex inputs are rejected',()=>{for(const x of ['#FFF','000000','#GG0000',null,42,'#12345678'])assert.throws(()=>hexToRgb(x),TypeError);});
test('invalid RGB channels are rejected',()=>{for(const x of [[0,0],[256,0,0],[NaN,0,0],[1.1,0,0],['0',0,0]])assert.throws(()=>rgbToHex(x),TypeError);});
test('sRGB transfer curve uses the linear low segment',()=>{close(srgbToLinear(0),0);close(srgbToLinear(1),1);close(srgbToLinear(.04045),.04045/12.92);assert.throws(()=>srgbToLinear(2));});
test('known luminance endpoints and primaries',()=>{close(relativeLuminance('#000000'),0);close(relativeLuminance('#FFFFFF'),1);close(relativeLuminance('#FF0000'),.2126);});
test('black-white contrast is 21 and same-colour contrast is 1',()=>{close(contrastRatio('#000000','#FFFFFF'),21);close(contrastRatio('#123456','#123456'),1);});
test('contrast is symmetric',()=>{close(contrastRatio('#123456','#E3A411'),contrastRatio('#E3A411','#123456'));});
test('contrast thresholds are not rounded upwards',()=>{assert.equal(passesContrast('#777777','#FFFFFF'),false);assert.equal(passesContrast('#767676','#FFFFFF'),true);assert.throws(()=>passesContrast('#000000','#FFFFFF',22));});
test('D65 Lab agrees with known black, white and red references',()=>{const black=hexToLab('#000000'),white=hexToLab('#FFFFFF'),red=hexToLab('#FF0000');black.forEach(v=>close(v,0));close(white[0],100,.0001);close(white[1],0,.0001);close(white[2],0,.0001);close(red[0],53.2408,.001);close(red[1],80.0925,.001);close(red[2],67.2032,.001);});
test('CIE76 is Euclidean, not CIEDE2000',()=>{close(deltaE76([0,0,0],[3,4,0]),5);close(deltaE76([5,4,3],[5,4,3]),0);assert.throws(()=>deltaE76([0,NaN,0],[0,0,0]));});
test('mixing preserves endpoints and uses deterministic half-even rounding',()=>{assert.equal(mixHex('#000000','#FFFFFF',0),'#000000');assert.equal(mixHex('#000000','#FFFFFF',1),'#FFFFFF');assert.equal(mixHex('#000000','#010101',.5),'#000000');assert.throws(()=>mixHex('#000000','#FFFFFF',-1));});
test('best text selection is deterministic and has input guards',()=>{assert.equal(bestTextColor('#FFFFFF'),'#101010');assert.equal(bestTextColor('#000000'),'#FFFFFF');assert.throws(()=>bestTextColor('#000000',[]));});
test('derived roles do not mutate source colours',()=>{const colors=Object.freeze(['#E6A0C4','#C6CDF7']);const tokens=deriveMode(colors,'light');assert.notEqual(tokens.series,colors);assert.deepEqual(tokens.series,colors);assert.equal(tokens.accent,colors[0]);assert.ok(auditRolePairs(tokens).every(p=>p.pass));});
test('derivation rejects unknown modes and missing colours',()=>{assert.throws(()=>deriveMode([],'light'));assert.throws(()=>deriveMode(['#FFFFFF'],'unknown'));});
