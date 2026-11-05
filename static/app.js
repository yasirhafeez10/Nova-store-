// NOVA.STORE localhost frontend - talks to the Python/SQLite backend in server.py
let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem('nova_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('nova_wish') || '[]');
let user = JSON.parse(localStorage.getItem('nova_user') || 'null');
let shopState = { category: '', search: '', max_price: '', min_rating: '', sort: '', shown: 8 };
let currentProduct = null, selSize = '', selColor = '', selQty = 1;

const $ = id => document.getElementById(id);
const money = n => '$' + Number(n).toFixed(2);
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2600); }
function saveCart(){ localStorage.setItem('nova_cart', JSON.stringify(cart)); renderCounts(); }
function saveWish(){ localStorage.setItem('nova_wish', JSON.stringify(wishlist)); renderCounts(); }
function renderCounts(){
  $('cartCount').textContent = cart.reduce((a,i)=>a+i.qty,0);
  $('wishCount').textContent = wishlist.length;
}
async function api(path, opts){
  const r = await fetch(path, opts);
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
const post = (path, body) => api(path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});

function showView(name){
  ['home','shop','product','cart','checkout','wishlist','account','admin','about','contact'].forEach(v=>{
    $('view-'+v).classList.toggle('hidden', v!==name);
  });
  window.scrollTo(0,0);
  if(name==='home') renderHome();
  if(name==='shop') renderShop();
  if(name==='cart') renderCart();
  if(name==='wishlist') renderWishlist();
  if(name==='account') renderAccount();
  if(name==='admin') renderAdmin();
  if(name==='about') $('view-about').innerHTML = `<h2 class="title">About Us</h2><div class="card"><p>NOVA.STORE is a premium online shopping platform built as a full-stack project: a Python backend, a SQLite database and a responsive frontend. We sell electronics, fashion, home &amp; living and beauty products at honest prices.</p></div>`;
  if(name==='contact') renderContact();
}
function stars(r){ return '★'.repeat(Math.round(r)) + '☆'.repeat(5-Math.round(r)); }
function cardHTML(p){
  const wished = wishlist.includes(p.id) ? '❤️' : '🤍';
  return `<div class="card">
    ${p.discount_percent ? `<div class="badge">-${p.discount_percent}%</div>` : ''}
    <button class="wish" onclick="toggleWish(${p.id})">${wished}</button>
    <div class="emoji" onclick="openProduct(${p.id})">${p.emoji}</div>
    <h3 onclick="openProduct(${p.id})">${p.name}</h3>
    <div class="cat">${p.category} · <span class="stars">${stars(p.rating)}</span> ${p.rating}</div>
    <div class="price"><b>${money(p.price)}</b><s>${money(p.original_price)}</s></div>
    <div class="cat">${p.stock > 0 ? 'In stock: ' + p.stock : 'Out of stock'}</div><br>
    <button class="btn small" onclick="quickAdd(${p.id})" ${p.stock===0?'disabled':''}>Add to Cart</button>
    <button class="btn small ghost" onclick="openProduct(${p.id})">Details</button>
  </div>`;
}
function toggleWish(id){
  wishlist = wishlist.includes(id) ? wishlist.filter(x=>x!==id) : [...wishlist, id];
  saveWish(); toast(wishlist.includes(id) ? 'Added to wishlist' : 'Removed from wishlist');
  const v = ['home','shop','product','wishlist'].find(x=>!$('view-'+x).classList.contains('hidden'));
  if(v) showView(v);
}
function quickAdd(id){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  const line = cart.find(i=>i.id===id && !i.size && !i.color);
  if(line) line.qty++; else cart.push({id, qty:1, size:'', color:''});
  saveCart(); toast(p.name + ' added to cart');
}
function onSearch(v){ shopState.search=v; shopState.shown=8; if(v) { showView('shop'); } else renderShop(); }
function setCategory(c){ shopState.category=c; shopState.shown=8; renderShop(); }

async function loadProducts(){
  const d = await api('/api/products');
  PRODUCTS = d.products;
}
function renderHome(){
  const trending = [...PRODUCTS].sort((a,b)=>b.rating-a.rating).slice(0,4);
  const best = [...PRODUCTS].sort((a,b)=>b.sold-a.sold).slice(0,4);
  const fresh = [...PRODUCTS].sort((a,b)=>b.id-a.id).slice(0,4);
  const deals = PRODUCTS.filter(p=>p.discount_percent>=25).slice(0,4);
  const cats = [['Electronics','💻'],['Fashion','👕'],['Home & Living','🏠'],['Beauty','💄']];
  $('view-home').innerHTML = `
    <div class="hero"><h1>Premium Shopping, Honest Prices</h1>
      <p>Electronics, fashion, home &amp; living and beauty — delivered to your door. Use code <b>WELCOME10</b> for 10% off, free shipping over $75.</p><br>
      <button class="btn" onclick="showView('shop')">Shop Now</button></div>
    <h2 class="title">Featured Categories</h2>
    <div class="cat-grid">${cats.map(c=>`<div class="cat-card" onclick="showView('shop');setCategory('${c[0]}')"><span class="big">${c[1]}</span>${c[0]}</div>`).join('')}</div>
    <h2 class="title">🔥 Trending Products</h2><div class="grid">${trending.map(cardHTML).join('')}</div>
    <h2 class="title">🏆 Best Sellers</h2><div class="grid">${best.map(cardHTML).join('')}</div>
    <h2 class="title">✨ New Arrivals</h2><div class="grid">${fresh.map(cardHTML).join('')}</div>
    <h2 class="title">💸 Special Deals</h2><div class="grid">${deals.map(cardHTML).join('')}</div>
    <h2 class="title">What Customers Say</h2>
    <div class="testi">
      <div class="card"><span class="stars">★★★★★</span><p>"The headphones arrived in two days and the quality is amazing for the price."</p><b>— Ayesha K.</b></div>
      <div class="card"><span class="stars">★★★★★</span><p>"Easy checkout, and the leather bag looks even better in real life."</p><b>— Bilal R.</b></div>
      <div class="card"><span class="stars">★★★★☆</span><p>"Good prices and the WELCOME10 code really works. Recommended."</p><b>— Fatima S.</b></div>
    </div>
    <div class="newsletter"><h2>Join Our Newsletter</h2><p>Get deals and new arrivals in your inbox. (Demo: saved locally, no email is sent.)</p><br>
      <input id="newsEmail" type="email" placeholder="Your email"><button class="btn" onclick="subscribeNews()">Subscribe</button></div>`;
}
async function subscribeNews(){
  try{ await post('/api/newsletter', {email: $('newsEmail').value}); toast('Subscribed. Thank you!'); $('newsEmail').value=''; }
  catch(e){ toast(e.message); }
}
function renderShop(){
  const cats = ['', 'Electronics','Fashion','Home & Living','Beauty'];
  $('view-shop').innerHTML = `
    <h2 class="title">Shop</h2>
    <div class="filters">
      <div><label>Category</label><select onchange="shopState.category=this.value;shopState.shown=8;applyShop()">
        ${cats.map(c=>`<option ${c===shopState.category?'selected':''} value="${c}">${c||'All categories'}</option>`).join('')}</select></div>
      <div><label>Max price ($)</label><input type="number" min="0" placeholder="Any" value="${shopState.max_price}" onchange="shopState.max_price=this.value;shopState.shown=8;applyShop()"></div>
      <div><label>Min rating</label><select onchange="shopState.min_rating=this.value;shopState.shown=8;applyShop()">
        <option value="">Any</option>${[4,4.5,4.7].map(r=>`<option ${String(r)===shopState.min_rating?'selected':''} value="${r}">${r}+ ★</option>`).join('')}</select></div>
      <div><label>Sort by</label><select onchange="shopState.sort=this.value;shopState.shown=8;applyShop()">
        <option value="">Default</option><option value="price_low">Price: low to high</option>
        <option value="price_high">Price: high to low</option><option value="newest">Newest</option>
        <option value="popularity">Popularity</option></select></div>
      <div><label>Search</label><input type="text" placeholder="Product name" value="${shopState.search}" oninput="shopState.search=this.value;shopState.shown=8;applyShop()"></div>
    </div>
    <div id="shopGrid"></div>`;
  applyShop();
}
async function applyShop(){
  const qs = new URLSearchParams();
  if(shopState.category) qs.set('category', shopState.category);
  if(shopState.search) qs.set('search', shopState.search);
  if(shopState.max_price) qs.set('max_price', shopState.max_price);
  if(shopState.min_rating) qs.set('min_rating', shopState.min_rating);
  if(shopState.sort) qs.set('sort', shopState.sort);
  const d = await api('/api/products?' + qs.toString());
  const el = $('shopGrid'); if(!el) return;
  const items = d.products;
  el.innerHTML = (items.length
    ? `<div class="grid">${items.slice(0, shopState.shown).map(cardHTML).join('')}</div>`
    : `<div class="empty">No products match these filters.</div>`)
    + (items.length > shopState.shown ? `<br><div style="text-align:center"><button class="btn" onclick="shopState.shown+=8;applyShop()">Load More (${items.length - shopState.shown} more)</button></div>` : '');
}
async function openProduct(id){
  const d = await api('/api/products/' + id);
  currentProduct = d.product; selSize = currentProduct.sizes[0] || ''; selColor = currentProduct.colors[0] || ''; selQty = 1;
  showView('product');
  $('view-product').innerHTML = `
    <button class="btn ghost small" onclick="showView('shop')">← Back to Shop</button>
    <div class="row" style="margin-top:16px">
      <div><div class="gallery-main">${currentProduct.emoji}</div>
        <p style="text-align:center;margin-top:10px">${currentProduct.colors.map(c=>`<span class="chip">${c}</span>`).join('') || 'Standard edition'}</p></div>
      <div class="card">
        <h2>${currentProduct.name}</h2><div class="cat">${currentProduct.category}</div>
        <p style="margin:10px 0"><span class="stars">${stars(currentProduct.rating)}</span> ${currentProduct.rating} · ${d.reviews.length} review(s)</p>
        <div class="price"><b>${money(currentProduct.price)}</b><s>${money(currentProduct.original_price)}</s> <span class="badge" style="position:static">-${currentProduct.discount_percent}%</span></div>
        <p style="margin:10px 0">${currentProduct.description}</p>
        <p>Stock: <b>${currentProduct.stock > 0 ? currentProduct.stock + ' available' : 'Out of stock'}</b></p>
        ${currentProduct.sizes.length ? `<p style="margin-top:12px">Size:</p><div>${currentProduct.sizes.map(s=>`<button class="chip ${s===selSize?'on':''}" onclick="selSize='${s}';openProductRefresh()">${s}</button>`).join('')}</div>` : ''}
        ${currentProduct.colors.length ? `<p style="margin-top:12px">Colour:</p><div>${currentProduct.colors.map(s=>`<button class="chip ${s===selColor?'on':''}" onclick="selColor='${s}';openProductRefresh()">${s}</button>`).join('')}</div>` : ''}
        <p style="margin-top:12px">Qty: <button class="chip" onclick="selQty=Math.max(1,selQty-1);openProductRefresh()">−</button> <b>${selQty}</b> <button class="chip" onclick="selQty++;openProductRefresh()">+</button></p>
        <br><button class="btn" onclick="addCurrent()">Add to Cart</button>
        <button class="btn ghost" onclick="toggleWish(${currentProduct.id})">❤️ Wishlist</button>
      </div>
    </div>
    <h2 class="title">Customer Reviews</h2>
    ${d.reviews.length ? d.reviews.map(r=>`<div class="card" style="margin-bottom:10px"><span class="stars">${stars(r.rating)}</span> <b>${r.email}</b><p>${r.text}</p></div>`).join('') : '<div class="empty">No reviews yet. Be the first.</div>'}
    <div class="form" style="margin-top:14px"><h3>Add a review</h3>
      <label>Rating (1-5)</label><input id="revRating" type="number" min="1" max="5" value="5">
      <label>Your review</label><textarea id="revText" rows="3"></textarea><br><br>
      <button class="btn" onclick="submitReview(${currentProduct.id})">Submit Review</button></div>
    <h2 class="title">Related Products</h2><div class="grid">${d.related.map(cardHTML).join('') || '<div class="empty">No related products.</div>'}</div>`;
}
function openProductRefresh(){ openProduct(currentProduct.id); }
function addCurrent(){
  const line = cart.find(i=>i.id===currentProduct.id && i.size===selSize && i.color===selColor);
  if(line) line.qty += selQty; else cart.push({id: currentProduct.id, qty: selQty, size: selSize, color: selColor});
  saveCart(); toast('Added to cart');
}
async function submitReview(pid){
  try{
    await post('/api/reviews', {product_id: pid, email: user ? user.email : 'guest', rating: Number($('revRating').value), text: $('revText').value});
    toast('Review added'); openProduct(pid);
  }catch(e){ toast(e.message); }
}

function cartDetailed(){
  return cart.map(i=>({...i, product: PRODUCTS.find(p=>p.id===i.id)})).filter(i=>i.product);
}
function cartSubtotal(){ return cartDetailed().reduce((a,i)=>a + i.product.price*i.qty, 0); }
function renderCart(){
  const lines = cartDetailed();
  if(!lines.length){ $('view-cart').innerHTML = `<h2 class="title">Your Cart</h2><div class="empty">Your cart is empty.<br><br><button class="btn" onclick="showView('shop')">Continue Shopping</button></div>`; return; }
  const sub = cartSubtotal();
  $('view-cart').innerHTML = `<h2 class="title">Your Cart</h2>
    <table><tr><th>Product</th><th>Variant</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr>
    ${lines.map((i,idx)=>`<tr><td>${i.product.emoji} ${i.product.name}</td><td>${[i.size,i.color].filter(Boolean).join(' / ') || '-'}</td>
      <td>${money(i.product.price)}</td>
      <td><button class="chip" onclick="changeQty(${idx},-1)">−</button> ${i.qty} <button class="chip" onclick="changeQty(${idx},1)">+</button></td>
      <td>${money(i.product.price*i.qty)}</td><td><button class="btn small ghost" onclick="removeLine(${idx})">Remove</button></td></tr>`).join('')}
    </table>
    <div class="card" style="margin-top:16px;max-width:460px;margin-left:auto">
      <p>Subtotal: <b>${money(sub)}</b></p>
      <label>Promo code</label> <input id="promoInput" type="text" placeholder="WELCOME10" style="padding:9px;border:1px solid #e7e2da;border-radius:8px">
      <p style="color:#6b7280;margin-top:8px">Shipping and discount are calculated at checkout. Free shipping over $75.</p><br>
      <button class="btn ghost" onclick="showView('shop')">Continue Shopping</button>
      <button class="btn" onclick="renderCheckout()">Proceed to Checkout</button>
    </div>`;
}
function changeQty(idx, d){ cart[idx].qty += d; if(cart[idx].qty < 1) cart.splice(idx,1); saveCart(); renderCart(); }
function removeLine(idx){ cart.splice(idx,1); saveCart(); renderCart(); }
function renderCheckout(){ showView('checkout');
  const sub = cartSubtotal();
  $('view-checkout').innerHTML = `<h2 class="title">Checkout</h2>
  <div class="row"><div class="form">
    <label>Full name *</label><input id="coName" value="${user ? user.name : ''}">
    <label>Email *</label><input id="coEmail" value="${user ? user.email : ''}">
    <label>Phone *</label><input id="coPhone">
    <label>Delivery address *</label><input id="coAddress">
    <label>City *</label><input id="coCity">
    <label>Shipping method</label><select id="coShipping"><option>Standard</option><option>Express (+$9.99)</option></select>
    <label>Payment method</label><select id="coPayment"><option>Cash on Delivery</option><option>Debit/Credit Card (demo)</option></select>
    <label>Promo code</label><input id="coPromo" value="${($('promoInput') && $('promoInput').value) || ''}" placeholder="WELCOME10">
    <br><br><button class="btn" onclick="placeOrder()">Place Order</button>
    <p style="color:#6b7280;margin-top:10px">Demo checkout — no real payment is taken.</p>
  </div>
  <div class="card"><h3>Order Summary</h3><br>
    ${cartDetailed().map(i=>`<p>${i.product.name} × ${i.qty} — ${money(i.product.price*i.qty)}</p>`).join('')}
    <hr style="margin:12px 0"><p>Subtotal: <b>${money(sub)}</b></p><p>Shipping/discount calculated when you place the order.</p></div></div>`;
}
async function placeOrder(){
  const body = { name: $('coName').value.trim(), email: $('coEmail').value.trim(), phone: $('coPhone').value.trim(),
    address: $('coAddress').value.trim(), city: $('coCity').value.trim(),
    shipping: $('coShipping').value.startsWith('Express') ? 'Express' : 'Standard',
    payment: $('coPayment').value, promo: $('coPromo').value.trim(),
    items: cart.map(i=>({id:i.id, qty:i.qty, size:i.size, color:i.color})) };
  if(!body.name || !body.email.includes('@') || !body.phone || !body.address || !body.city){ toast('Fill all fields with * and a valid email'); return; }
  try{
    const d = await post('/api/orders', body);
    cart = []; saveCart(); await loadProducts();
    $('view-checkout').innerHTML = `<div class="empty"><h2>✅ Order Confirmed!</h2><p>Order #${d.order_id} placed successfully.</p>
      <p>Discount: ${money(d.discount)} · Shipping: ${money(d.shipping_cost)} · <b>Total paid (demo): ${money(d.total)}</b></p><br>
      <button class="btn" onclick="showView('shop')">Continue Shopping</button></div>`;
  }catch(e){ toast(e.message); }
}
function renderWishlist(){
  const items = PRODUCTS.filter(p=>wishlist.includes(p.id));
  $('view-wishlist').innerHTML = `<h2 class="title">My Wishlist</h2>` +
    (items.length ? `<div class="grid">${items.map(cardHTML).join('')}</div>` : `<div class="empty">Nothing in your wishlist yet.</div>`);
}
function renderContact(){
  $('view-contact').innerHTML = `<h2 class="title">Contact Us</h2><div class="form">
    <label>Name</label><input id="ctName"><label>Email</label><input id="ctEmail">
    <label>Message *</label><textarea id="ctMsg" rows="4"></textarea><br><br>
    <button class="btn" onclick="sendContact()">Send Message</button></div>`;
}
async function sendContact(){
  try{ await post('/api/contact', {name: $('ctName').value, email: $('ctEmail').value, message: $('ctMsg').value});
    toast('Message saved. We will reply soon (demo).'); $('ctMsg').value=''; }catch(e){ toast(e.message); }
}
function renderAccount(){
  if(!user){
    $('view-account').innerHTML = `<h2 class="title">My Account</h2><div class="row">
      <div class="form"><h3>Login</h3>
        <label>Email</label><input id="liEmail" type="email"><label>Password</label><input id="liPw" type="password"><br><br>
        <button class="btn" onclick="doLogin()">Login</button></div>
      <div class="form"><h3>Register</h3>
        <label>Name</label><input id="rgName"><label>Email</label><input id="rgEmail" type="email">
        <label>Password (4+ characters)</label><input id="rgPw" type="password"><br><br>
        <button class="btn" onclick="doRegister()">Create Account</button>
        <h3 style="margin-top:22px">Forgot password (demo reset)</h3>
        <label>Email</label><input id="rsEmail" type="email"><label>New password</label><input id="rsPw" type="password"><br><br>
        <button class="btn ghost" onclick="doReset()">Reset Password</button>
        <p style="color:#6b7280;margin-top:8px">Demo only — the password is changed directly, no email is sent.</p></div></div>`;
    return;
  }
  $('view-account').innerHTML = `<h2 class="title">Welcome, ${user.name}</h2>
    <p>${user.email} &nbsp; <button class="btn small ghost" onclick="doLogout()">Logout</button></p>
    <div class="row" style="margin-top:16px">
      <div class="form"><h3>Saved Addresses</h3><div id="addrList"></div>
        <label>Label</label><input id="adLabel" value="Home"><label>Address</label><input id="adAddress">
        <label>City</label><input id="adCity"><label>Phone</label><input id="adPhone"><br><br>
        <button class="btn" onclick="addAddress()">Save Address</button></div>
      <div><h3 style="margin-bottom:12px">My Order History</h3><div id="orderList"></div></div>
    </div>`;
  loadAddresses(); loadOrders();
}
async function doRegister(){
  try{ const d = await post('/api/register', {name: $('rgName').value, email: $('rgEmail').value, password: $('rgPw').value});
    user = {name: d.name, email: d.email}; localStorage.setItem('nova_user', JSON.stringify(user)); toast('Account created'); renderAccount();
  }catch(e){ toast(e.message); }
}
async function doLogin(){
  try{ const d = await post('/api/login', {email: $('liEmail').value, password: $('liPw').value});
    user = {name: d.name, email: d.email}; localStorage.setItem('nova_user', JSON.stringify(user)); toast('Welcome back, ' + d.name); renderAccount();
  }catch(e){ toast(e.message); }
}
async function doReset(){
  try{ await post('/api/reset-password', {email: $('rsEmail').value, password: $('rsPw').value}); toast('Password reset (demo). Now login.'); }
  catch(e){ toast(e.message); }
}
function doLogout(){ user = null; localStorage.removeItem('nova_user'); renderAccount(); }
async function loadAddresses(){
  const d = await api('/api/addresses?email=' + encodeURIComponent(user.email));
  $('addrList').innerHTML = d.addresses.length ? d.addresses.map(a=>`<p style="margin:8px 0"><b>${a.label}:</b> ${a.address}, ${a.city} · ${a.phone}
    <button class="btn small ghost" onclick="delAddress(${a.id})">Delete</button></p>`).join('') : '<p style="color:#6b7280">No addresses saved yet.</p>';
}
async function addAddress(){
  await post('/api/addresses', {email: user.email, label: $('adLabel').value, address: $('adAddress').value, city: $('adCity').value, phone: $('adPhone').value});
  toast('Address saved'); loadAddresses();
}
async function delAddress(id){ await api('/api/addresses/' + id, {method:'DELETE'}); loadAddresses(); }
async function loadOrders(){
  const d = await api('/api/orders?email=' + encodeURIComponent(user.email));
  $('orderList').innerHTML = d.orders.length ? d.orders.map(o=>`<div class="card" style="margin-bottom:10px">
    <b>Order #${o.id}</b> — ${o.status} — <b>${money(o.total)}</b><br>
    ${o.items.map(i=>`${i.name} × ${i.qty}`).join(', ')}<br><span style="color:#6b7280">${o.created_at}</span></div>`).join('')
    : '<div class="empty">No orders yet.</div>';
}
async function renderAdmin(){
  const d = await api('/api/admin/stats');
  await loadProducts();
  const maxRev = Math.max(...d.revenue_by_category.map(r=>r.revenue), 1);
  $('view-admin').innerHTML = `<h2 class="title">Admin Dashboard (demo — no login needed locally)</h2>
    <div class="stat-grid">
      <div class="stat">Total Sales<b>${money(d.stats.total_sales)}</b></div>
      <div class="stat">Total Orders<b>${d.stats.total_orders}</b></div>
      <div class="stat">Total Customers<b>${d.stats.total_customers}</b></div>
      <div class="stat">Total Products<b>${d.stats.total_products}</b></div>
    </div>
    <h2 class="title">Revenue by Category</h2><div class="card">
      ${d.revenue_by_category.map(r=>`<div class="bar-row"><span style="width:130px">${r.category}</span><div class="bar" style="width:${Math.round(r.revenue/maxRev*55)}%"></div><b>${money(r.revenue)}</b></div>`).join('') || 'No sales yet.'}
    </div>
    <h2 class="title">Orders</h2>
    ${d.orders.length ? `<table><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th><th>Change</th></tr>
      ${d.orders.map(o=>`<tr><td>${o.id}</td><td>${o.name} (${o.email})</td><td>${money(o.total)}</td><td>${o.status}</td>
      <td><select onchange="setOrderStatus(${o.id}, this.value)">${['Pending','Confirmed','Shipped','Delivered','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table>` : '<div class="empty">No orders yet.</div>'}
    <h2 class="title">Customers</h2>
    ${d.customers.length ? `<table><tr><th>Name</th><th>Email</th></tr>${d.customers.map(c=>`<tr><td>${c.name}</td><td>${c.email}</td></tr>`).join('')}</table>` : '<div class="empty">No registered customers yet.</div>'}
    <h2 class="title">Products / Inventory</h2>
    <table><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Save</th><th>Delete</th></tr>
    ${PRODUCTS.map(p=>`<tr><td><input id="ap-name-${p.id}" value="${p.name}" style="width:180px;padding:6px"></td>
      <td><input id="ap-cat-${p.id}" value="${p.category}" style="width:120px;padding:6px"></td>
      <td><input id="ap-price-${p.id}" type="number" step="0.01" value="${p.price}" style="width:90px;padding:6px"></td>
      <td><input id="ap-stock-${p.id}" type="number" value="${p.stock}" style="width:70px;padding:6px"></td>
      <td><button class="btn small" onclick="saveProduct(${p.id})">Save</button></td>
      <td><button class="btn small ghost" onclick="deleteProduct(${p.id})">Delete</button></td></tr>`).join('')}</table>
    <h2 class="title">Add Product</h2><div class="form">
      <label>Name</label><input id="npName"><label>Category</label>
      <select id="npCat"><option>Electronics</option><option>Fashion</option><option>Home &amp; Living</option><option>Beauty</option></select>
      <label>Price</label><input id="npPrice" type="number" step="0.01"><label>Stock</label><input id="npStock" type="number" value="10">
      <label>Description</label><textarea id="npDesc" rows="2"></textarea><br><br>
      <button class="btn" onclick="addProduct()">Add Product</button></div>`;
}
async function setOrderStatus(id, status){ await post(`/api/admin/orders/${id}/status`, {status}); toast('Order #' + id + ' → ' + status); }
async function saveProduct(id){
  await api('/api/admin/products/' + id, {method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name: $('ap-name-'+id).value, category: $('ap-cat-'+id).value, price: $('ap-price-'+id).value, stock: $('ap-stock-'+id).value})});
  toast('Product saved'); renderAdmin();
}
async function deleteProduct(id){ await api('/api/admin/products/' + id, {method:'DELETE'}); toast('Product deleted'); renderAdmin(); }
async function addProduct(){
  await post('/api/admin/products', {name: $('npName').value, category: $('npCat').value, price: $('npPrice').value, stock: $('npStock').value, description: $('npDesc').value});
  toast('Product added'); renderAdmin();
}
function renderStatic(){}
(async function init(){ await loadProducts(); renderCounts(); showView('home'); })();
