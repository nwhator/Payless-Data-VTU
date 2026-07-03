import React,{useEffect,useState,useCallback}from"react"
import{Pencil,RefreshCcw,Loader2}from"lucide-react"
import{toast}from"sonner"
type ProductType={
id:number
name:string
capacity?:string
price:number
currency?:string
customer_margin?:number|null
agent_margin?:number|null
customer_price?:number|null
agent_price?:number|null
profit?:number|null
}
type MarginRule={min:number;max:number;customer:number;agent:number}
type MarginSetting=MarginRule[]
const getCookieToken=():string|null=>{
try{
const tokenMatch=document.cookie.match(/XSRF-TOKEN=([^;]+)/);
return tokenMatch&&tokenMatch[1]?decodeURIComponent(tokenMatch[1]):null;
}catch(e){
console.error("Error reading CSRF token from cookie:",e);
return null;
}
}
export default function PricesAndProfit({margins}:{margins?:MarginSetting}){
const[products,setProducts]=useState<ProductType[]>([])
const[loading,setLoading]=useState(true)
const[syncing,setSyncing]=useState(false)
const[editingId,setEditingId]=useState<number|null>(null)
const[savingId,setSavingId]=useState<number|null>(null)
const[form,setForm]=useState<{customer_margin:number|'';agent_margin:number|'';}>({
customer_margin:"",
agent_margin:"",
})
const fetchCsrfCookie=async()=>{
try{
await fetch("/sanctum/csrf-cookie",{
method:'GET',
headers:{'Accept':'application/json'}
})
}catch(e){
console.error("Failed to refresh CSRF cookie:",e);
}
}
const fetchProducts=async()=>{
setLoading(true)
try{
const res=await fetch("/admin/products",{headers:{Accept:"application/json"}})
const data=await res.json()
if(data.success){
setProducts(data.products)
}else{
toast.error(data.message||"⚠️ Failed to fetch products")
}
}catch{
toast.error("⚠️ Network error loading products")
}finally{
setLoading(false)
}
}
useEffect(()=>{
void fetchCsrfCookie()
void fetchProducts()
},[])
const startEdit=(p:ProductType)=>{
setEditingId(p.id)
setForm({
customer_margin:p.customer_margin??'',
agent_margin:p.agent_margin??'',
})
}
const cancelEdit=()=>{
setEditingId(null)
setForm({customer_margin:"",agent_margin:""})
}
const save=async(id:number)=>{
if(form.customer_margin===""&&form.agent_margin===""){
toast.error("Please enter a margin value before saving.")
return
}
const csrfToken=getCookieToken();
if(!csrfToken){
toast.error("CSRF token missing. Please refresh the page.");
return;
}
setSavingId(id)
try{
const res=await fetch(`/admin/products/${id}/update-margin`,{
method:"POST",
headers:{
"Content-Type":"application/json",
Accept:"application/json",
"X-Requested-With":"XMLHttpRequest",
"X-XSRF-TOKEN":csrfToken,
},
body:JSON.stringify({
customer_margin:form.customer_margin||null,
agent_margin:form.agent_margin||null,
}),
credentials:"same-origin",
})
const data=await res.json()
if(data.success&&data.product){
toast.success("✅ Margins updated successfully")
const updatedProduct={
...data.product,
profit:
(data.product.customer_price??0)-
(data.product.base_price??data.product.price??0),
}
setProducts(prev=>prev.map(p=>(p.id===id?updatedProduct:p)))
cancelEdit()
}else{
toast.error(data.message||"❌ Failed to update margins")
}
}catch{
toast.error("❌ Error saving margin")
}finally{
setSavingId(null)
}
}
const syncProducts=async()=>{
setSyncing(true)
const csrfToken=getCookieToken();
if(!csrfToken){
toast.error("CSRF token missing. Please refresh the page.");
setSyncing(false);
return;
}
try{
const res=await fetch("/admin/products/sync",{
method:"POST",
headers:{
Accept:"application/json",
"X-XSRF-TOKEN":csrfToken,
},
credentials:"same-origin",
})
const data=await res.json()
if(data.success&&data.products){
toast.success("✅ Synced successfully")
setProducts(data.products)
}else{
toast.error(data.message||"❌ Sync failed")
}
}catch{
toast.error("⚠️ Sync failed. Check your connection.")
}finally{
setSyncing(false)
}
}
if(loading){
return(
<div className="flex justify-center items-center py-16 text-white">
<Loader2 className="w-6 h-6 animate-spin mr-2"/>Loading products...
</div>
)
}
if(!products.length){
return(
<div className="flex flex-col items-center justify-center py-16 text-center text-white space-y-4">
<p className="text-lg text-slate-300">No products found in the database.</p>
<button
onClick={syncProducts}
disabled={syncing}
className="flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-xl font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
>
{syncing?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCcw className="w-4 h-4"/>}
{syncing?"Syncing...":"Sync Products"}
</button>
</div>
)
}
return(
<div className="space-y-6">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
<h2 className="text-2xl font-bold text-white">Prices & Profit</h2>
<button
onClick={syncProducts}
disabled={syncing}
className="flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2 rounded-lg text-white hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-60"
>
{syncing?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCcw className="w-4 h-4"/>}
{syncing?"Syncing...":"Sync"}
</button>
</div>
<div className="hidden md:block overflow-x-auto bg-white/5 border border-white/10 rounded-xl shadow-lg">
<table className="w-full text-sm min-w-[800px]">
<thead className="bg-white/10 text-left text-slate-200">
<tr>
<th className="p-3">Product</th>
<th className="p-3">Capacity</th>
<th className="p-3">Wholesale</th>
<th className="p-3">Customer Price</th>
<th className="p-3">Agent Price</th>
<th className="p-3">Profit</th>
<th className="p-3 text-center">Actions</th>
</tr>
</thead>
<tbody>
{products.map(p=>(
<tr key={p.id}className="border-t border-white/10 hover:bg-white/5 transition">
<td className="p-3 font-semibold text-white">{p.name}</td>
<td className="p-3 text-slate-300">{p.capacity||"-"}</td>
<td className="p-3 text-slate-300">GHS {(p.price??0).toFixed(2)}</td>
<td className="p-3 text-blue-400">GHS {(p.customer_price??0).toFixed(2)}</td>
<td className="p-3 text-indigo-400">GHS {(p.agent_price??0).toFixed(2)}</td>
<td className="p-3 text-green-400 font-semibold">
+GHS {(p.profit??0).toFixed(2)}
</td>
<td className="p-3 text-center">
{editingId===p.id?(
<div className="flex items-center gap-2 justify-center">
<input
type="number"
step="0.01"
placeholder="Customer"
className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-center focus:ring-1 focus:ring-emerald-500"
value={form.customer_margin}
onChange={e=>
setForm({
...form,
customer_margin:e.target.value===""?"":Number(e.target.value),
})
}
/>
<input
type="number"
step="0.01"
placeholder="Agent"
className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-center focus:ring-1 focus:ring-emerald-500"
value={form.agent_margin}
onChange={e=>
setForm({
...form,
agent_margin:e.target.value===""?"":Number(e.target.value),
})
}
/>
<button
onClick={()=>save(p.id)}
disabled={savingId===p.id}
className="bg-emerald-600 px-3 py-1 rounded text-white flex items-center gap-2 disabled:opacity-60"
>
{savingId===p.id?(
<Loader2 className="w-4 h-4 animate-spin"/>
):(
"Save"
)}
</button>
<button
onClick={cancelEdit}
className="text-slate-300 px-2 py-1 hover:text-white transition"
>
Cancel
</button>
</div>
):(
<button
onClick={()=>startEdit(p)}
className="p-1.5 rounded hover:bg-white/10 text-slate-300"
>
<Pencil className="w-4 h-4"/>
</button>
)}
</td>
</tr>
))}
</tbody>
</table>
</div>
<div className="grid gap-4 md:hidden">
{products.map(p=>(
<div
key={p.id}
className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-md text-slate-200"
>
<div className="flex justify-between items-center mb-2">
<h3 className="font-semibold text-white">{p.name}</h3>
<span className="text-sm text-slate-400">{p.capacity||"-"}</span>
</div>
<div className="space-y-1 text-sm">
<p>
<span className="text-slate-400">Wholesale:</span>{" "}
<span className="text-slate-300">GHS {(p.price??0).toFixed(2)}</span>
</p>
<p>
<span className="text-slate-400">Customer:</span>{" "}
<span className="text-blue-400">GHS {(p.customer_price??0).toFixed(2)}</span>
</p>
<p>
<span className="text-slate-400">Agent:</span>{" "}
<span className="text-indigo-400">GHS {(p.agent_price??0).toFixed(2)}</span>
</p>
<p>
<span className="text-slate-400">Profit:</span>{" "}
<span className="text-green-400 font-semibold">
+GHS {(p.profit??0).toFixed(2)}
</span>
</p>
</div>
<div className="mt-3 text-right">
{editingId===p.id?(
<div className="flex flex-col sm:flex-row items-center gap-2">
<input
type="number"
step="0.01"
placeholder="Customer"
className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-center focus:ring-1 focus:ring-emerald-500"
value={form.customer_margin}
onChange={e=>
setForm({
...form,
customer_margin:e.target.value===""?"":Number(e.target.value),
})
}
/>
<input
type="number"
step="0.01"
placeholder="Agent"
className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-center focus:ring-1 focus:ring-emerald-500"
value={form.agent_margin}
onChange={e=>
setForm({
...form,
agent_margin:e.target.value===""?"":Number(e.target.value),
})
}
/>
<div className="flex gap-2">
<button
onClick={()=>save(p.id)}
disabled={savingId===p.id}
className="bg-emerald-600 px-3 py-1 rounded text-white flex items-center gap-2 text-sm disabled:opacity-60"
>
{savingId===p.id?(
<Loader2 className="w-4 h-4 animate-spin"/>
):(
"Save"
)}
</button>
<button
onClick={cancelEdit}
className="text-slate-300 px-3 py-1 rounded hover:text-white transition text-sm"
>
Cancel
</button>
</div>
</div>
):(
<button
onClick={()=>startEdit(p)}
className="mt-2 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1.5 rounded-lg text-sm transition"
>
<Pencil className="w-4 h-4"/>Edit
</button>
)}
</div>
</div>
))}
</div>
</div>
)
}