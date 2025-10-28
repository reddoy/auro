"use strict";(()=>{var t={};t.id=7543,t.ids=[7543],t.modules={2885:t=>{t.exports=require("@supabase/supabase-js")},399:t=>{t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:t=>{t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8448:(t,e,s)=>{s.r(e),s.d(e,{originalPathname:()=>l,patchFetch:()=>c,requestAsyncStorage:()=>p,routeModule:()=>d,serverHooks:()=>m,staticGenerationAsyncStorage:()=>_});var a={};s.r(a),s.d(a,{GET:()=>o});var n=s(9303),r=s(8716),u=s(670),i=s(2885);async function o(t){try{let e=new URL(t.url).searchParams.get("period")||"7d",s=process.env.NEXT_PUBLIC_SUPABASE_URL||"",a=process.env.SUPABASE_SERVICE_ROLE_KEY||"";if(!s||!a)return new Response(JSON.stringify({error:"Server misconfigured"}),{status:500});let n=(0,i.createClient)(s,a),{data:r,error:u}=await n.from("requests").select(`
        status,
        payment_status,
        refund_status,
        dispute_status,
        amount_cents,
        application_fee_cents,
        reviewer_amount_cents,
        refunded_amount_cents,
        payment_distributed,
        payment_distribution_attempts,
        created_at
      `).not("amount_cents","is",null);if(u)return console.error("Failed to fetch payment stats:",u),new Response(JSON.stringify({error:"Failed to fetch payment stats"}),{status:500});let o={totalRequests:0,totalRevenue:0,totalFees:0,totalPaidOut:0,totalRefunded:0,pendingPayouts:0,failedDistributions:0,openDisputes:0,timeoutRequests:0,statusBreakdown:{},paymentStatusBreakdown:{},refundStatusBreakdown:{},disputeStatusBreakdown:{}};r?.forEach(t=>{let e=t.amount_cents||0,s=t.application_fee_cents||0,a=t.reviewer_amount_cents||0,n=t.refunded_amount_cents||0;o.totalRequests++,o.totalRevenue+=e,o.totalFees+=s,o.totalPaidOut+=a,o.totalRefunded+=n,o.statusBreakdown[t.status||"unknown"]=(o.statusBreakdown[t.status||"unknown"]||0)+1,o.paymentStatusBreakdown[t.payment_status||"unknown"]=(o.paymentStatusBreakdown[t.payment_status||"unknown"]||0)+1,o.refundStatusBreakdown[t.refund_status||"none"]=(o.refundStatusBreakdown[t.refund_status||"none"]||0)+1,o.disputeStatusBreakdown[t.dispute_status||"none"]=(o.disputeStatusBreakdown[t.dispute_status||"none"]||0)+1,"completed"!==t.status||t.payment_distributed||(o.pendingPayouts+=e-s),t.payment_distribution_attempts&&t.payment_distribution_attempts>0&&!t.payment_distributed&&o.failedDistributions++,"timeout"===t.status&&o.timeoutRequests++});let{data:d,error:p}=await n.from("disputes").select("status, dispute_type, created_at").eq("status","open");p||(o.openDisputes=d?.length||0);let{data:_,error:m}=await n.from("requests").select(`
        id,
        status,
        payment_status,
        refund_status,
        amount_cents,
        created_at,
        updated_at,
        profiles!requests_user_id_fkey (
          username,
          full_name
        )
      `).order("updated_at",{ascending:!1}).limit(20),{data:l,error:c}=await n.from("requests").select(`
        id,
        status,
        amount_cents,
        application_fee_cents,
        payment_distribution_attempts,
        payment_distribution_error,
        payment_distribution_failed_at,
        profiles!requests_influencer_id_fkey (
          username,
          full_name,
          stripe_connect_account_id
        )
      `).eq("status","completed").eq("payment_distributed",!1).not("payment_distribution_failed_at","is",null).order("payment_distribution_failed_at",{ascending:!1}).limit(10),{data:f,error:y}=await n.from("requests").select(`
        id,
        status,
        amount_cents,
        refund_status,
        refund_reason,
        created_at,
        profiles!requests_user_id_fkey (
          username,
          full_name,
          email
        )
      `).eq("status","timeout").eq("refund_status","none").order("created_at",{ascending:!1}).limit(10);return new Response(JSON.stringify({success:!0,period:e,stats:{...o,totalRevenueUSD:(o.totalRevenue/100).toFixed(2),totalFeesUSD:(o.totalFees/100).toFixed(2),totalPaidOutUSD:(o.totalPaidOut/100).toFixed(2),totalRefundedUSD:(o.totalRefunded/100).toFixed(2),pendingPayoutsUSD:(o.pendingPayouts/100).toFixed(2)},recentActivity:_||[],failedDistributions:l||[],timeoutRequests:f||[],alerts:{failedDistributions:o.failedDistributions,openDisputes:o.openDisputes,timeoutRequests:o.timeoutRequests,pendingPayouts:o.pendingPayouts}}),{status:200})}catch(t){return console.error("Error fetching payment dashboard:",t),new Response(JSON.stringify({error:t.message||"Failed to fetch payment dashboard",errorType:"UNKNOWN_ERROR"}),{status:500})}}let d=new n.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/admin/payment-dashboard/route",pathname:"/api/admin/payment-dashboard",filename:"route",bundlePath:"app/api/admin/payment-dashboard/route"},resolvedPagePath:"C:\\Users\\rohan\\OneDrive\\Desktop\\auro\\site\\app\\api\\admin\\payment-dashboard\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:p,staticGenerationAsyncStorage:_,serverHooks:m}=d,l="/api/admin/payment-dashboard/route";function c(){return(0,u.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:_})}},9303:(t,e,s)=>{t.exports=s(517)}};var e=require("../../../../webpack-runtime.js");e.C(t);var s=t=>e(e.s=t),a=e.X(0,[8948],()=>s(8448));module.exports=a})();