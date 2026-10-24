'use client';
import {create} from 'zustand';
import type {SessionUser} from '@/services/auth';
interface AuthState {user:SessionUser|null;loaded:boolean;error:string;setSession:(user:SessionUser|null,error?:string)=>void;}
export const useAuthStore=create<AuthState>(set=>({user:null,loaded:false,error:'',setSession:(user,error='')=>set({user,loaded:true,error})}));
