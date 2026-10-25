"use client";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getActiveMembership,
  getResidentDeals,
  getResidentOrders,
  getSupabaseClient,
  hasSupabaseConfig,
  joinSociety,
  placeResidentOrder,
  type ResidentDeal,
  type ResidentOrder,
  type SocietyMembership,
} from "@/lib/societypool";

type Deal = { id: string; name: string; pack: string; category: string; price: number; mrp: number; joined: number; target: number; close: string; photo: string; label: string };
const deals: Deal[] = [
 { id:"mango",name:"Alphonso mangoes",pack:"Ratnagiri · 6 premium pieces",category:"Fresh picks",price:349,mrp:499,joined:42,target:60,close:"5h 24m",photo:"https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85",label:"NEIGHBOURHOOD FAVOURITE" },
 { id:"eggs",name:"Free-range brown eggs",pack:"Farm fresh · Pack of 12",category:"Dairy & eggs",price:89,mrp:125,joined:31,target:45,close:"8h 10m",photo:"https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=85",label:"26% LESS" },
 { id:"tomatoes",name:"Farm-picked tomatoes",pack:"Naturally ripened · 1 kg",category:"Fresh picks",price:32,mrp:48,joined:67,target:80,close:"Tomorrow",photo:"https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85",label:"ALMOST THERE" },
 { id:"oil",name:"Wood-pressed groundnut oil",pack:"Cold pressed · 1 litre",category:"Pantry",price:219,mrp:299,joined:18,target:50,close:"1 day",photo:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85",label:"26% LESS" },
 { id:"berries",name:"Seasonal strawberries",pack:"Mahabaleshwar · 250 g",category:"Fresh picks",price:119,mrp:169,joined:23,target:35,close:"11h",photo:"https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=85",label:"GROWN NEARBY" },
 { id:"paneer",name:"Malai paneer",pack:"Made today · 400 g",category:"Dairy & eggs",price:129,mrp:169,joined:12,target:40,close:"Tomorrow",photo:"https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=85",label:"FRESH TODAY" },
];
const categories = ["Everything","Fresh picks","Dairy & eggs","Pantry"];
type Page = "Home"|"Deals"|"Orders"|"Profile";
function Icon({ name, size=18 }: { name:string; size?:number }) { const p:Record<string,ReactNode>={search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,pin:<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,bag:<><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,home:<><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6"/></>,grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,receipt:<><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h4"/></>,user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,plus:<><path d="M12 5v14M5 12h14"/></>,minus:<path d="M5 12h14"/>,arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,check:<path d="m5 12 4 4L19 6"/>,heart:<path d="M20.8 8.8c0 5.4-8.8 10.2-8.8 10.2S3.2 14.2 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/>}; return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>; }
export default function Home(){
 const [page,setPage]=useState<Page>("Home"),[category,setCategory]=useState("Everything"),[query,setQuery]=useState(""),[cart,setCart]=useState<Record<string,number>>({}),[detail,setDetail]=useState<Deal|null>(null),[confirm,setConfirm]=useState(false),[toast,setToast]=useState(""),[orders,setOrders]=useState<string[]>([]);
 const [user,setUser]=useState<User|null>(null),[membership,setMembership]=useState<SocietyMembership|null>(null),[backendDeals,setBackendDeals]=useState<ResidentDeal[]>([]),[residentOrders,setResidentOrders]=useState<ResidentOrder[]>([]),[backendLoading,setBackendLoading]=useState(true),[backendMessage,setBackendMessage]=useState(""),[authMode,setAuthMode]=useState<"sign-in"|"sign-up">("sign-in"),[authEmail,setAuthEmail]=useState(""),[authPassword,setAuthPassword]=useState(""),[fullName,setFullName]=useState(""),[inviteCode,setInviteCode]=useState(""),[authBusy,setAuthBusy]=useState(false),[checkoutBusy,setCheckoutBusy]=useState(false);
 const activeDeals:Deal[]=user?(membership?backendDeals:[]):deals;
 const items=Object.values(cart).reduce((a,b)=>a+b,0),total=activeDeals.reduce((n,d)=>n+d.price*(cart[d.id]||0),0);
 const visible=useMemo(()=>activeDeals.filter(d=>(category==="Everything"||d.category===category)&&`${d.name} ${d.pack}`.toLowerCase().includes(query.toLowerCase())),[activeDeals,category,query]);
 useEffect(()=>{
  const supabase=getSupabaseClient();
  if(!supabase){setBackendLoading(false);return}
  void supabase.auth.getSession().then(({data,error})=>{
   if(error)setBackendMessage(error.message);
   setUser(data.session?.user??null);
   setBackendLoading(false);
  });
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   setUser(session?.user??null);
   if(event==="SIGNED_IN"||event==="SIGNED_UP"){setCart({});setOrders([])}
   if(!session){setMembership(null);setBackendDeals([]);setResidentOrders([]);setCart({});}
   setBackendMessage("");
  });
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  let current=true;
  async function loadMembership(){
   if(!user){setMembership(null);setBackendDeals([]);setResidentOrders([]);setBackendLoading(false);return}
   setBackendLoading(true);
   try{const active=await getActiveMembership(user);if(current)setMembership(active)}
   catch(error){if(current)setBackendMessage(error instanceof Error?error.message:"Could not load your society membership.")}
   finally{if(current)setBackendLoading(false)}
  }
  void loadMembership();
  return()=>{current=false};
 },[user]);
 useEffect(()=>{
  let current=true;
  async function loadResidentData(){
   if(!user||!membership){setBackendDeals([]);setResidentOrders([]);return}
   setBackendLoading(true);
   try{
    const [loadedDeals,loadedOrders]=await Promise.all([getResidentDeals(membership.societyId),getResidentOrders(membership.societyId)]);
    if(current){setBackendDeals(loadedDeals);setResidentOrders(loadedOrders);setBackendMessage("")}
   }catch(error){if(current)setBackendMessage(error instanceof Error?error.message:"Could not load Society Pool data.")}
   finally{if(current)setBackendLoading(false)}
  }
  void loadResidentData();
  return()=>{current=false};
 },[user,membership]);
 function add(d:Deal,n=1){setCart(c=>({...c,[d.id]:Math.min(user?20:Number.MAX_SAFE_INTEGER,Math.max(0,(c[d.id]||0)+n))}));if(n>0){setToast(user&&cart[d.id]>=20?"Orders are limited to 20 of each deal.":`${d.name} added to your basket`);window.setTimeout(()=>setToast(""),2400)}}
 async function submitAuth(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setAuthBusy(true);setBackendMessage("");
  const supabase=getSupabaseClient();
  if(!supabase){setBackendMessage("Add your Supabase project URL and publishable key to frontend/.env.local.");setAuthBusy(false);return}
  try{
   if(authMode==="sign-up"){
    const {data,error}=await supabase.auth.signUp({email:authEmail.trim(),password:authPassword,options:{data:{full_name:fullName.trim()}}});
    if(error)throw error;
    setBackendMessage(data.session?"Your account is ready.":"Account created. Check your email to confirm it, then sign in.");
    if(!data.session)setAuthMode("sign-in");
   }else{
    const {error}=await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword});
    if(error)throw error;
    setBackendMessage("Signed in. Checking your society access…");setPage("Home");
   }
  }catch(error){setBackendMessage(error instanceof Error?error.message:"Authentication failed. Please try again.")}
  finally{setAuthBusy(false)}
 }
 async function submitJoin(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setAuthBusy(true);setBackendMessage("");
  try{const joined=await joinSociety(inviteCode.trim());setMembership(joined);setInviteCode("");setBackendMessage(`You joined ${joined.societyName}. Loading its deals…`)}
  catch(error){setBackendMessage(error instanceof Error?error.message:"Could not join that society.")}
  finally{setAuthBusy(false)}
 }
 async function signOut(){
  const supabase=getSupabaseClient();if(!supabase)return;
  const {error}=await supabase.auth.signOut();if(error)setBackendMessage(error.message);else{setPage("Home");setToast("You have signed out.")}
 }
 async function checkout(){
  if(!items)return;
  if(!user){setOrders(current=>[`SP-${Date.now().toString().slice(-5)}`,...current]);setCart({});setDetail(null);setConfirm(false);setPage("Orders");setToast("Demo order placed · no payment collected");return}
  if(!membership){setConfirm(false);setPage("Profile");setBackendMessage("Join your society before placing an order.");return}
  setCheckoutBusy(true);setBackendMessage("");
  const requested=activeDeals.filter(d=>(cart[d.id]??0)>0),placed:string[]=[];
  let failure="";
  for(const deal of requested){
   try{await placeResidentOrder(deal.id,cart[deal.id]);placed.push(deal.id)}
   catch(error){failure=error instanceof Error?error.message:"An order could not be placed.";break}
  }
  if(placed.length){
   setCart(current=>Object.fromEntries(Object.entries(current).filter(([id])=>!placed.includes(id))));
   try{setResidentOrders(await getResidentOrders(membership.societyId))}catch(error){setBackendMessage(error instanceof Error?error.message:"Order placed, but order history could not be refreshed.")}
   setDetail(null);setConfirm(false);setPage("Orders");
   setToast(failure?`${placed.length} of ${requested.length} orders placed. Review your orders before retrying.`:`${placed.length} order${placed.length===1?"":"s"} submitted · pending confirmation`);
  }
  if(failure)setBackendMessage(failure);
  if(!placed.length&&failure)setToast(failure);
  setCheckoutBusy(false);
 }
 const pageTitle=page==="Orders"?"Your orders":page==="Profile"?"Your Society Pool":"Good things, pooled together.";
 return <div className="app-shell"><div className="announcement"><b>✦</b> Bigger baskets. Better prices. <strong>That’s the pool effect.</strong><span>Made for your neighbourhood ♡</span></div>
  <header className="site-header"><a className="brand" href="#home" onClick={()=>setPage("Home")}><i className="brand-mark"><b/><b/><b/></i>society<span>pool</span><em>.</em></a><button className="location" onClick={()=>user&&!membership?setPage("Profile"):setToast(`Delivering to ${membership?.societyName??"Greenview Residency"}, ${membership?.cityArea??"Pune"}`)}><i><Icon name="pin"/></i><span><small>DELIVERING TO</small><b>{membership?.societyName??(user?"Join your society":"Greenview Residency")}⌄</b></span></button><label className="search"><Icon name="search"/><input aria-label="Search deals" placeholder="Search mangoes, milk, everyday goodness..." value={query} onChange={e=>{setQuery(e.target.value);setPage("Deals")}}/><kbd>⌘ K</kbd></label><button className="user-button" onClick={()=>setPage("Profile")}><i>{user?(user.email?.[0]?.toUpperCase()??"U"):"A"}</i><span>{user?(user.email?.split("@")[0]??"Account"):"Sign in"}</span>⌄</button><button className="cart-button" onClick={()=>setToast(items?`${items} item${items>1?"s":""} · ₹${total}`:"Your basket is waiting for something good")}><Icon name="bag"/> Basket {items>0&&<b>{items}</b>}</button></header>
 <nav className="desktop-nav" aria-label="Main navigation">{(["Home","Deals","Orders","Profile"] as Page[]).map(n=><button key={n} className={page===n?"selected":""} onClick={()=>setPage(n)}>{n}</button>)}</nav><main className="page-content" id="home"><div className="welcome"><div><div className="eyebrow"><i/> YOUR NEIGHBOURHOOD, IN ON THE GOOD STUFF</div><h1>{pageTitle}</h1><p>The more of us join, the less everyone pays. Simple as that.</p></div><div className="community"><span className="faces"><i>A</i><i>R</i><i>M</i><i>+</i></span><span><b>{user?membership?`${backendDeals.length} live deals`:"Join a society":"128 neighbours"}</b><small>{user?membership?"updated from your database":"join to browse live deals":"shopping smarter this week"}</small></span></div></div>
 {page==="Orders"?<section className="panel"><div className="panel-title"><div><small>YOUR ACTIVITY</small><h2>Orders & updates</h2></div><span className="demo-label">{user?"● LIVE ORDERS":"● DEMO MODE"}</span></div>{user?residentOrders.length?residentOrders.map(order=><div className="order-row" key={order.id}><i><Icon name="bag"/></i><span><b>Order {order.id.slice(0,8).toUpperCase()}</b><small>{new Date(order.createdAt).toLocaleString()} · {order.quantity} item{order.quantity===1?"":"s"} · ₹{order.total}</small></span><em>{order.status}</em><button onClick={()=>setToast("Order status is supplied by your Society Pool database.")}>Details <Icon name="arrow" size={14}/></button></div>):<div className="empty"><i><Icon name="bag" size={28}/></i><h3>No orders yet.</h3><p>Your orders for {membership?.societyName??"your society"} will appear here.</p><button className="button-primary" onClick={()=>setPage("Deals")}>Explore deals <Icon name="arrow" size={15}/></button></div>:orders.length?orders.map((o,i)=><div className="order-row" key={o}><i><Icon name="bag"/></i><span><b>Order {o}</b><small>{i===0?"Placed just now":"Earlier today"} · Demo payment</small></span><em>Pending confirmation</em><button onClick={()=>setToast("Sign in and join your society to view live orders.")}>Details <Icon name="arrow" size={14}/></button></div>):<div className="empty"><i><Icon name="bag" size={28}/></i><h3>Your next great deal starts here.</h3><p>Join a neighbourhood deal and your order updates will show up here.</p><button className="button-primary" onClick={()=>setPage("Deals")}>Explore deals <Icon name="arrow" size={15}/></button></div>}</section>:page==="Profile"?<section className="panel auth-panel"><div className="panel-title"><div><small>YOUR ACCOUNT</small><h2>{user?`Hi, ${user.user_metadata.full_name||user.email?.split("@")[0]||"neighbour"} 👋`:"Welcome to Society Pool"}</h2></div><span className="member-chip">{membership?`✦ ${membership.societyName}`:"✦ Resident account"}</span></div>{!hasSupabaseConfig?<div className="empty"><h3>Supabase connection details are missing.</h3><p>Add the project URL and publishable key to <code>frontend/.env.local</code>, then restart the development server.</p></div>:!user?<><p className="auth-intro">Sign in to join your society, see live pooled deals, and track your orders.</p><form className="auth-form" onSubmit={submitAuth}>{authMode==="sign-up"&&<label>Your name<input autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="e.g. Ananya Shah"/></label>}<label>Email address<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={authMode==="sign-up"?"new-password":"current-password"} minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required placeholder="At least 8 characters"/></label><button className="button-primary" type="submit" disabled={authBusy}>{authBusy?"Please wait…":authMode==="sign-up"?"Create resident account":"Sign in"}<Icon name="arrow" size={15}/></button></form><button className="auth-switch" onClick={()=>{setAuthMode(authMode==="sign-in"?"sign-up":"sign-in");setBackendMessage("")}}>{authMode==="sign-in"?"New to Society Pool? Create an account":"Already have an account? Sign in"}</button></>:!membership?<><p className="auth-intro">Signed in as <b>{user.email}</b>. Enter your society invite code to see its live deals.</p><form className="auth-form join-form" onSubmit={submitJoin}><label>Society invite code<input autoComplete="off" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} required placeholder="Enter the code shared by your society"/></label><button className="button-primary" type="submit" disabled={authBusy}>{authBusy?"Joining…":"Join my society"}<Icon name="arrow" size={15}/></button></form><p className="auth-help">Development demo invite code: GREENVIEW-DEMO-2026.</p><button className="auth-switch" onClick={signOut}>Sign out</button></>:<><div className="profile-grid"><div><small>YOUR SOCIETY</small><b>{membership.societyName}</b><span>{membership.cityArea}</span></div><div><small>YOUR ACCOUNT</small><b>{user.email}</b><span>Signed in securely</span></div><div><small>LIVE DEALS</small><b>{backendDeals.length}</b><span>Available to your community</span></div></div><button className="outline-button" onClick={signOut}>Sign out</button></>}{backendMessage&&<p className="backend-message" role="status">{backendMessage}</p>}{backendLoading&&user&&<p className="backend-message" role="status">Loading your Society Pool data…</p>}</section>:<>
 <section className="hero"><div className="hero-copy"><span className="hero-label">✦ &nbsp;THE NEIGHBOURHOOD EDIT</span><h2>Good food.<br/><em>Better together.</em></h2><p>Local favourites, pooled by your community.<br/>Your everyday basket, a little lighter.</p><button className="hero-cta" onClick={()=>document.getElementById("deals")?.scrollIntoView({behavior:"smooth"})}>Find your next favourite <i><Icon name="arrow" size={15}/></i></button><div className="hero-foot"><span>● &nbsp;{user&&membership?"Live pooled progress":"14 items pooled today"}</span><span>★★★★★ <small>LOVED LOCALLY</small></span></div></div><div className="hero-photo" role="img" aria-label="Fresh seasonal produce from local farms"><div className="photo-stamp">✦<b>LOCAL<br/>& LOVELY</b></div><div className="photo-caption"><small>FRESH FROM THE FARM</small><b>Picked for your people.</b></div></div></section>
 <section className="value-strip"><div className="value-title"><i>↗</i><span><b>Smaller price tags, together.</b><small>Here’s what the pool is doing</small></span></div><div className="value-stat"><b>{user&&membership?backendDeals.length:"₹18,420"}</b><small>{user&&membership?"open deals in your society":"saved by Greenview this month"}</small></div><div className="value-stat"><b>{user&&membership?residentOrders.length:36}</b><small>{user&&membership?"orders placed by you":"neighbourhood orders pooled"}</small></div><div className="value-note">✦ &nbsp;{user&&membership?"Live data · no payment collected":"Your community makes it happen"}</div></section>
 <section className="deals" id="deals"><div className="section-head"><div><small>A LITTLE BETTER, TOGETHER</small><h2>Deals your neighbours are into <i>✳</i></h2><p>Join the pool. Unlock the neighbourhood price.</p></div><button onClick={()=>{setPage("Deals");setCategory("Everything")}}>See all deals <Icon name="arrow" size={15}/></button></div><div className="toolbar"><div className="tabs">{categories.map(c=><button key={c} className={c===category?"active":""} onClick={()=>{setCategory(c);setPage("Deals")}}>{c}</button>)}</div><small>{user?membership?`● LIVE DATA · ${membership.societyName.toUpperCase()}`:backendLoading?"● CONNECTING TO SOCIETY POOL":"● JOIN YOUR SOCIETY FOR LIVE DEALS":"● DEMO MODE · SAMPLE DEALS"}</small></div>{backendMessage&&user&&<p className="backend-message" role="status">{backendMessage}</p>}
 <div className="deal-grid">{visible.map(d=><article className="deal-card" key={d.id}><button className="deal-photo" onClick={()=>setDetail(d)} aria-label={`View ${d.name} deal`}><img src={d.photo} alt={d.name} loading="lazy"/><b className={d.label==="ALMOST THERE"?"deal-label green":"deal-label"}>{d.label}</b><i className="heart"><Icon name="heart" size={16}/></i></button><div className="deal-body"><div className="deal-meta"><span>{d.category.toUpperCase()}</span><span><Icon name="clock" size={12}/> {d.close}</span></div><button className="deal-name" onClick={()=>setDetail(d)}><b>{d.name}</b><small>{d.pack}</small></button><div className="price"><span><b>₹{d.price}</b><del>₹{d.mrp}</del><i>SAVE {Math.round((1-d.price/d.mrp)*100)}%</i></span><small>per pack</small></div><div className="progress-meta"><span><b>{d.joined}</b> {user&&membership?"items pooled":"neighbours in"}</span><span><b>{Math.max(0,d.target-d.joined-(cart[d.id]||0))}</b> to unlock</span></div><div className="progress"><i style={{width:`${Math.min(100,((d.joined+(cart[d.id]||0))/d.target)*100)}%`}}/></div><div className="deal-bottom"><small>✦ Pool price unlocks at {d.target}</small>{cart[d.id]?<div className="qty"><button onClick={()=>add(d,-1)} aria-label="Remove one"><Icon name="minus" size={14}/></button><b>{cart[d.id]}</b><button onClick={()=>add(d)} aria-label="Add one"><Icon name="plus" size={14}/></button></div>:<button className="join" onClick={()=>add(d)}>Join deal <Icon name="plus" size={14}/></button>}</div></div></article>)}</div>{!visible.length&&<div className="empty-search"><h3>{backendLoading&&user?"Loading your society’s deals…":user&&!membership?"Join your society to see its live deals.":"No deals found just yet."}</h3>{user&&!membership?<button onClick={()=>setPage("Profile")}>Join your society</button>:<button onClick={()=>{setQuery("");setCategory("Everything")}}>Clear filters</button>}</div>}
 <section className="how"><div><small>THE POOL, IN THREE LITTLE STEPS</small><h2>It’s nicer when<br/>we do it together.</h2><p>Good things really do add up.</p></div>{[["01","＋","Find your thing","Pick the local favourite for your basket."],["02","•••","Bring your people","Your neighbours join in. The pool fills."],["03","↘","Enjoy a little less","When the goal is reached, everyone gets the pool price."]].map(([n,icon,title,copy])=><div className="step" key={n}><small>{n}</small><i>{icon}</i><b>{title}</b><p>{copy}</p></div>)}</section></section></>}
   <footer className="footer"><a className="brand" href="#home"><i className="brand-mark"><b/><b/><b/></i>society<span>pool</span><em>.</em></a><span>Better together, {membership?.societyName??"Greenview"}. ✦</span><small>{user&&membership?"LIVE SOCIETY DATA · NO PAYMENT IS COLLECTED":"DEMO EXPERIENCE · PRICES & ORDERS ARE SIMULATED"}</small></footer></main>
 <nav className="mobile-nav">{(["Home","Deals","Orders","Profile"] as Page[]).map(n=><button key={n} className={page===n?"selected":""} onClick={()=>setPage(n)}><Icon name={n==="Home"?"home":n==="Deals"?"grid":n==="Orders"?"receipt":"user"} size={19}/><small>{n}</small></button>)}</nav>
 {items>0&&<button className="basket-float" onClick={()=>setConfirm(true)}><b>{items}</b><span>View basket<small>₹{total}</small></span><i>Checkout <Icon name="arrow" size={15}/></i></button>}
 {toast&&<div className="toast" role="status"><i><Icon name="check" size={15}/></i>{toast}<button onClick={()=>setToast("")} aria-label="Dismiss"><Icon name="close" size={14}/></button></div>}
 {confirm&&<div className="overlay" onClick={()=>setConfirm(false)}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setConfirm(false)} aria-label="Close"><Icon name="close"/></button><span className="section-kicker">{membership?membership.societyName.toUpperCase():"YOUR GREENVIEW BASKET"}</span><h2 id="confirm-title">One last look.</h2><p>Here’s what you’re joining the pool for.</p><div className="confirm-items">{activeDeals.filter(d=>cart[d.id]).map(d=><div key={d.id}><span>{cart[d.id]} × {d.name}</span><b>₹{d.price*cart[d.id]}</b></div>)}</div><div className="confirm-total"><span>{user?"Estimated total":"Demo total"}</span><b>₹{total}</b></div><p className="confirm-note">{user?"The server validates the deal price and records your order. No payment is collected.":"Demo payment only · no real payment details are collected. Sign in and join your society to place a real order."}</p><button className="button-primary confirm-submit" onClick={checkout} disabled={checkoutBusy}>{checkoutBusy?"Submitting order…":user?"Place order":"Place demo order"} <Icon name="arrow" size={15}/></button></section></div>}{detail&&<div className="overlay" onClick={()=>setDetail(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="deal-title" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setDetail(null)} aria-label="Close"><Icon name="close"/></button><img src={detail.photo} alt={detail.name}/><div className="modal-content"><small>{detail.category.toUpperCase()} · {membership?.societyName??"GREENVIEW RESIDENCY"}</small><h2 id="deal-title">{detail.name}</h2><p>{detail.pack}. Sourced from trusted local partners and pooled by your neighbours for a better everyday price.</p><div className="modal-price"><b>₹{detail.price}</b><del>₹{detail.mrp}</del><span>neighbourhood price</span></div><div className="modal-progress"><div className="progress-meta"><span><b>{detail.joined+(cart[detail.id]||0)}</b> of {detail.target} items pooled</span><b>{Math.round(((detail.joined+(cart[detail.id]||0))/detail.target)*100)}%</b></div><div className="progress"><i style={{width:`${Math.min(100,((detail.joined+(cart[detail.id]||0))/detail.target)*100)}%`}}/></div><small>Pool price applies if the deal reaches its target before closing.</small></div><button className="button-primary modal-join" onClick={()=>add(detail)}>Add to your basket <b>₹{detail.price}</b><Icon name="plus" size={16}/></button><small className="demo-hint">{user?"✓ Order uses server-side pricing · no payment collected":"✓ Demo order only · no payment collected"}</small></div></section></div>}
 </div>
}


