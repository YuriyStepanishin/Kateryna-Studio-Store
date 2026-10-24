'use client';
import {useSyncExternalStore} from 'react';
// Keep in sync with the desktop breakpoint in CSS Modules.
const query='(min-width: 1200px)';
const subscribe=(notify:()=>void)=>{const media=window.matchMedia(query);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const snapshot=()=>window.matchMedia(query).matches;
const serverSnapshot=()=>false;
export function useDesktop(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}
