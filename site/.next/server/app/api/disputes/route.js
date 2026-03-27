"use strict";(()=>{var e={};e.id=4569,e.ids=[4569],e.modules={92885:e=>{e.exports=require("@supabase/supabase-js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},38900:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>f,patchFetch:()=>m,requestAsyncStorage:()=>c,routeModule:()=>p,serverHooks:()=>_,staticGenerationAsyncStorage:()=>l});var r={};t.r(r),t.d(r,{GET:()=>d,POST:()=>o});var i=t(49303),u=t(88716),a=t(60670),n=t(92885);async function o(e){try{let{requestId:s,disputeType:t,description:r,evidence:i}=await e.json();if(!s||!t||!r)return new Response(JSON.stringify({error:"Missing required fields"}),{status:400});let u=process.env.NEXT_PUBLIC_SUPABASE_URL||"",a=process.env.SUPABASE_SERVICE_ROLE_KEY||"";if(!u||!a)return new Response(JSON.stringify({error:"Server misconfigured"}),{status:500});let o=(0,n.createClient)(u,a),{data:d,error:p}=await o.from("requests").select(`
        id,
        user_id,
        influencer_id,
        status,
        dispute_status,
        profiles!requests_user_id_fkey (
          id,
          email,
          full_name,
          username
        )
      `).eq("id",s).maybeSingle();if(p)return console.error("Failed to fetch request:",p),new Response(JSON.stringify({error:"Failed to fetch request"}),{status:500});if(!d)return new Response(JSON.stringify({error:"Request not found"}),{status:404});if(d.dispute_status&&"none"!==d.dispute_status)return new Response(JSON.stringify({error:"Dispute already exists for this request",disputeStatus:d.dispute_status}),{status:400});let{data:c,error:l}=await o.from("disputes").insert({request_id:s,customer_id:d.user_id,reviewer_id:d.influencer_id,dispute_type:t,description:r,customer_evidence:i||null,status:"open",priority:"medium"}).select().single();if(l)return console.error("Failed to create dispute:",l),new Response(JSON.stringify({error:"Failed to create dispute"}),{status:500});let{error:_}=await o.from("requests").update({dispute_id:c.id,dispute_status:"open"}).eq("id",s);return _&&console.error("Failed to update request dispute status:",_),new Response(JSON.stringify({success:!0,disputeId:c.id,message:"Dispute created successfully"}),{status:200})}catch(e){return console.error("Error creating dispute:",e),new Response(JSON.stringify({error:e.message||"Failed to create dispute",errorType:"UNKNOWN_ERROR"}),{status:500})}}async function d(e){try{let s=new URL(e.url),t=s.searchParams.get("userId"),r=s.searchParams.get("status"),i=parseInt(s.searchParams.get("limit")||"50"),u=process.env.NEXT_PUBLIC_SUPABASE_URL||"",a=process.env.SUPABASE_SERVICE_ROLE_KEY||"";if(!u||!a)return new Response(JSON.stringify({error:"Server misconfigured"}),{status:500});let o=(0,n.createClient)(u,a).from("disputes").select(`
        id,
        request_id,
        dispute_type,
        status,
        priority,
        description,
        created_at,
        updated_at,
        resolved_at,
        resolution,
        resolution_type,
        refund_amount_cents,
        requests!inner (
          id,
          status,
          amount_cents,
          created_at
        ),
        profiles!disputes_customer_id_fkey (
          id,
          username,
          full_name,
          email
        ),
        profiles!disputes_reviewer_id_fkey (
          id,
          username,
          full_name,
          email
        )
      `).order("created_at",{ascending:!1}).limit(i);t&&(o=o.or(`customer_id.eq.${t},reviewer_id.eq.${t}`)),r&&(o=o.eq("status",r));let{data:d,error:p}=await o;if(p)return console.error("Failed to fetch disputes:",p),new Response(JSON.stringify({error:"Failed to fetch disputes"}),{status:500});return new Response(JSON.stringify({success:!0,disputes:d||[],count:d?.length||0}),{status:200})}catch(e){return console.error("Error fetching disputes:",e),new Response(JSON.stringify({error:e.message||"Failed to fetch disputes",errorType:"UNKNOWN_ERROR"}),{status:500})}}let p=new i.AppRouteRouteModule({definition:{kind:u.x.APP_ROUTE,page:"/api/disputes/route",pathname:"/api/disputes",filename:"route",bundlePath:"app/api/disputes/route"},resolvedPagePath:"/Users/rohanomalley/Desktop/auro/site/app/api/disputes/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:c,staticGenerationAsyncStorage:l,serverHooks:_}=p,f="/api/disputes/route";function m(){return(0,a.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:l})}},49303:(e,s,t)=>{e.exports=t(30517)}};var s=require("../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),r=s.X(0,[8948],()=>t(38900));module.exports=r})();