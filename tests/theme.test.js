import test from 'node:test';
import assert from 'node:assert/strict';
import {getTheme,saveTheme,storageKeys} from '../lib/storage.js';

function mem(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
test('theme defaults to system and persists supported modes',()=>{const s=mem();assert.equal(getTheme(s),'system');assert.equal(saveTheme('dark',s),true);assert.equal(getTheme(s),'dark');assert.equal(saveTheme('light',s),true);assert.equal(getTheme(s),'light');assert.ok(storageKeys.theme);});
test('invalid theme is normalized to system',()=>{const s=mem();saveTheme('neon',s);assert.equal(getTheme(s),'system');});
