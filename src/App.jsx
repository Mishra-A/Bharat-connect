import React, { useEffect, useMemo, useState } from 'react'
import {
  Home, Compass, Bell, Bookmark, UserRound, Mail, Search, Plus, Image as ImageIcon,
  Smile, MapPin, Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, Check,
  Flame, Hash, Users, Settings, Globe2, ChevronDown, Sparkles, X, Send, Menu,
  BadgeCheck, TrendingUp, ShieldCheck, Languages, SlidersHorizontal
} from 'lucide-react'
import AuthModal from './AuthModal.jsx'
import { api, clearSession, getAccessToken, mapApiPost } from './api.js'

const initialPosts = [
  { id: 1, name: 'Aarav Sharma', handle: '@aaravbuilds', avatar: 'AS', color: 'blue', verified: true, time: '12m', location: 'Bengaluru', text: 'India doesn’t need to copy Silicon Valley. We can build products for our own realities — multilingual by default, mobile-first, and accessible to everyone. 🇮🇳', tags: ['BuildForIndia', 'Product'], likes: 284, replies: 32, reposts: 61, following: false, liked: false, reposted: false, saved: false },
  { id: 2, name: 'Priya Verma', handle: '@priyawrites', avatar: 'PV', color: 'rose', verified: false, time: '28m', location: 'Lucknow', text: 'आज का विचार: छोटे शहरों के सपने छोटे नहीं होते। अवसर हर भाषा में, हर शहर में पहुँचने चाहिए। 💙', tags: ['Hindi', 'India'], likes: 156, replies: 18, reposts: 24, following: true, liked: true, reposted: false, saved: false },
  { id: 3, name: 'The Tech Brief', handle: '@thetechbrief_in', avatar: 'TB', color: 'dark', verified: true, time: '41m', location: 'New Delhi', text: 'A great Indian internet experience should feel local without feeling limited. What is one feature you wish every Indian app had?', tags: ['DigitalIndia'], likes: 93, replies: 47, reposts: 19, following: false, liked: false, reposted: false, saved: true },
  { id: 4, name: 'Meera Iyer', handle: '@meeramakes', avatar: 'MI', color: 'green', verified: false, time: '1h', location: 'Chennai', text: 'Building in public, one small improvement at a time. Today: making our onboarding work just as well in Tamil as it does in English. 🌱', tags: ['Startups', 'Design'], likes: 72, replies: 9, reposts: 8, following: false, liked: false, reposted: false, saved: false },
]
const trends = [
  { category: 'Technology · Trending', tag: '#BuildForIndia', posts: '12.8K posts' },
  { category: 'India · Popular', tag: '#DigitalIndia', posts: '8,420 posts' },
  { category: 'Startups · Trending', tag: '#MadeInIndia', posts: '6,108 posts' },
  { category: 'Lucknow · Local', tag: '#UPStartups', posts: '2,341 posts' },
]
const people = [
  { name: 'Ananya Gupta', handle: '@ananyacodes', avatar: 'AG', color: 'purple', bio: 'Designing useful things for India' },
  { name: 'India Innovates', handle: '@indiainnovates', avatar: 'II', color: 'orange', bio: 'Ideas, people & progress 🇮🇳' },
  { name: 'Kabir Khan', handle: '@kabircreates', avatar: 'KK', color: 'teal', bio: 'Creator • Bengaluru' },
]

function Avatar({ initials, color = 'blue', size = 'md' }) {
  return <div className={`avatar avatar-${color} ${size === 'lg' ? 'avatar-lg' : size === 'sm' ? 'avatar-sm' : ''}`}>{initials}</div>
}
function Brand() {
  return <div className="flex items-center gap-3">
    <div className="brand-mark"><span></span><span></span><span></span></div>
    <div><div className="brand-name">bharat<span>connect</span></div><div className="brand-tag">India speaks here.</div></div>
  </div>
}
function App() {
  const [active, setActive] = useState('Home')
  const [posts, setPosts] = useState(initialPosts)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [following, setFollowing] = useState({})
  const [lang, setLang] = useState('English')
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('bc_user') || 'null') } catch { return null } })
  const [backendReady, setBackendReady] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [profileTab, setProfileTab] = useState('Posts')
  const [replyTo, setReplyTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'like', text: 'Priya Verma liked your post', time: '4m', read: false, initials: 'PV', color: 'rose' },
    { id: 2, type: 'follow', text: 'The Tech Brief started following you', time: '22m', read: false, initials: 'TB', color: 'dark' },
    { id: 3, type: 'reply', text: 'Aarav Sharma replied: “Exactly this!”', time: '1h', read: true, initials: 'AS', color: 'blue' },
  ])
  const nav = [
    { label: 'Home', icon: Home }, { label: 'Explore', icon: Compass }, { label: 'Notifications', icon: Bell, count: notifications.filter(n => !n.read).length },
    { label: 'Messages', icon: Mail }, { label: 'Bookmarks', icon: Bookmark }, { label: 'Profile', icon: UserRound },
  ]
  useEffect(() => {
    let alive = true
    api.feed().then(data => {
      if (!alive) return
      const rows = Array.isArray(data) ? data : (data.results || [])
      setPosts(rows.map(mapApiPost))
      setBackendReady(true)
      setFeedError('')
    }).catch(err => {
      if (alive) { setFeedError('API unavailable — showing demo posts. Start the Django backend to use live data.'); }
    })
    if (getAccessToken()) {
      api.me().then(user => { if (alive) setCurrentUser(user) }).catch(() => { if (alive) setCurrentUser(null) })
    }
    return () => { alive = false }
  }, [])

  const handleAuthSuccess = (user) => {
    setCurrentUser(user)
    setAuthOpen(false)
    flash(`Welcome, ${user.display_name || user.username}!`)
    api.feed().then(data => {
      const rows = Array.isArray(data) ? data : (data.results || [])
      setPosts(rows.map(mapApiPost)); setBackendReady(true); setFeedError('')
    }).catch(() => {})
  }

  const shownPosts = useMemo(() => {
    let result = [...posts]
    if (active === 'Bookmarks') result = result.filter(p => p.saved)
    if (active === 'Profile') result = result.filter(p => p.name === 'You')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => `${p.name} ${p.handle} ${p.text} ${p.tags.join(' ')}`.toLowerCase().includes(q))
    }
    return result
  }, [posts, active, search])
  const flash = (msg) => { setNotice(msg); window.setTimeout(() => setNotice(''), 2400) }
  const togglePost = (id, field, countField) => setPosts(old => old.map(p => p.id !== id ? p : {
    ...p, [field]: !p[field], ...(countField ? { [countField]: p[countField] + (p[field] ? -1 : 1) } : {})
  }))
  const publish = async () => {
    if (!draft.trim()) return flash('Write something before posting.')
    if (!getAccessToken()) { setAuthOpen(true); return flash('Sign in to publish a post.') }
    try {
      const created = await api.createPost({ text: draft.trim(), language: lang === 'हिन्दी' ? 'hi' : 'en', visibility: 'public' })
      setPosts(old => [mapApiPost(created), ...old])
      setDraft(''); setShowComposer(false); setActive('Home'); setSearch('')
      flash('Post published to the live API.')
    } catch (err) { flash(err.message || 'Could not publish post.') }
  }
  const doReply = async (id) => {
    if (!replyDraft.trim()) return
    const post = posts.find(p => p.id === id)
    if (!getAccessToken()) { setAuthOpen(true); return flash('Sign in to reply.') }
    if (!post?.backendId) return flash('Replies are available on live posts. Refresh the feed first.')
    try {
      await api.createReply(post.backendId, replyDraft.trim())
      setPosts(old => old.map(p => p.id === id ? { ...p, replies: p.replies + 1 } : p))
      setReplyDraft(''); setReplyTo(null); flash('Reply published.')
    } catch (err) { flash(err.message || 'Could not publish reply.') }
  }
  const navTo = async (label) => {
    setActive(label); setSearch(''); setMobileMenu(false)
    if (label === 'Bookmarks' && getAccessToken()) {
      try { const data = await api.bookmarks(); const rows = Array.isArray(data) ? data : (data.results || []); setPosts(old => [...rows.map(mapApiPost), ...old.filter(p => !rows.some(r => r.id === p.backendId))]); }
      catch (err) { flash(err.message || 'Could not load bookmarks.') }
    }
    if (label === 'Notifications' && getAccessToken()) {
      try { const rows = await api.notifications(); setNotifications(rows.map(n => ({ id:n.id, type:n.type, text:`${n.actor.display_name || n.actor.username} ${n.type === 'like' ? 'liked your post' : n.type === 'follow' ? 'started following you' : 'replied to your post'}`, time:new Date(n.created_at).toLocaleString(), read:n.is_read, initials:(n.actor.display_name || n.actor.username).slice(0,2).toUpperCase(), color:'blue' }))); await api.markNotificationsRead() }
      catch (err) { flash(err.message || 'Could not load notifications.') }
    } else if (label === 'Notifications') setNotifications(ns => ns.map(n => ({...n, read:true})))
  }
  const navText = active === 'Home' ? 'Your daily dose of India.' : active === 'Explore' ? 'Find your people. Follow your curiosity.' : active === 'Notifications' ? 'You’re all caught up.' : active === 'Messages' ? 'Conversations that bring us closer.' : active === 'Bookmarks' ? 'The posts you saved for later.' : 'Your corner of BharatConnect.'
  const title = search ? 'Search results' : active
  return <div className="app-shell">
    <aside className={`left-sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}><X size={19}/></button></div>
      <button className="language-switch" onClick={() => {setLang(lang === 'English' ? 'हिन्दी' : 'English'); flash(`Language preview: ${lang === 'English' ? 'हिन्दी' : 'English'}`)}}><Languages size={17}/><span>{lang}</span><ChevronDown size={15} className="ml-auto"/></button>
      <nav className="main-nav">
        {nav.map(({label, icon: Icon, count}) => <button key={label} onClick={() => navTo(label)} className={`nav-item ${active === label ? 'nav-active' : ''}`}><Icon size={21} strokeWidth={active === label ? 2.4 : 1.8}/><span>{label}</span>{count > 0 && <span className="nav-count">{count}</span>}</button>)}
      </nav>
      <button className="post-button" onClick={() => setShowComposer(true)}><Plus size={19}/><span>Write a post</span></button>
      <div className="sidebar-bottom">
        <button className="mini-profile mini-profile-button" onClick={() => currentUser ? (clearSession(), setCurrentUser(null), flash('Signed out.')) : setAuthOpen(true)}><Avatar initials={currentUser ? (currentUser.display_name || currentUser.username || 'Y').slice(0,1).toUpperCase() : 'Y'} color="blue"/><div className="min-w-0 text-left"><div className="font-bold text-sm">{currentUser ? (currentUser.display_name || currentUser.username) : 'Sign in / Register'}</div><div className="text-xs text-muted">{currentUser ? '@' + currentUser.username + ' · Sign out' : 'Connect to the live app'}</div></div><MoreHorizontal size={18} className="ml-auto text-muted"/></button>
        <div className="sidebar-footer"><ShieldCheck size={14}/> India-inspired <span>•</span> Unofficial prototype</div>
      </div>
    </aside>
    {mobileMenu && <div className="scrim" onClick={() => setMobileMenu(false)}></div>}
    <main className="feed-column">
      <div className="bharat-banner">
        <div className="banner-copy">
          <span className="banner-eyebrow">BHARATCONNECT • COMMUNITY PROTOTYPE</span>
          <strong>विकसित भारत, सबकी आवाज़</strong>
          <span>Ideas · People · Progress</span>
        </div>
        <div className="banner-chakra" aria-hidden="true">☸</div>
        <span className="banner-ribbon" aria-hidden="true"></span>
      </div>
      <header className="mobile-header"><button className="icon-button" onClick={() => setMobileMenu(true)}><Menu size={21}/></button><Brand/><button className="icon-button" onClick={() => document.getElementById('search-box')?.focus()}><Search size={20}/></button></header>
      <div className="feed-heading">
        {feedError && <div className="backend-status"><span className="status-dot"></span>{feedError}</div>}
        {backendReady && <div className="backend-status backend-live"><span className="status-dot"></span>Connected to BharatConnect API</div>}
        <div className="heading-row"><div><h1>{title}</h1><p>{navText}</p></div><button className="icon-button filter-button" title="Feed settings" onClick={() => flash('Feed preferences are a prototype feature.')}><SlidersHorizontal size={18}/></button></div>
        {active === 'Home' && !search && <div className="feed-tabs"><button className="tab-active">For you <span></span></button><button onClick={() => flash('Following feed selected in preview.')}>Following</button><button onClick={() => flash('Local feed selected in preview.')}>Near you <MapPin size={13}/></button></div>}
      </div>
      <div className="search-mobile"><Search size={17}/><input id="search-box" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search BharatConnect"/></div>
      {(active === 'Home' || active === 'Profile') && !search && <section className="composer-card">
        <Avatar initials="Y" color="blue" size="lg"/>
        <div className="composer-main"><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder={lang === 'हिन्दी' ? 'क्या चल रहा है?' : "What's happening across India?"} rows={2} maxLength={280} />
          <div className="composer-actions"><div className="composer-tools"><button title="Add image" onClick={() => flash('Media upload will be enabled in the full app.')}><ImageIcon size={18}/></button><button title="Add emoji" onClick={() => setDraft(d => d + ' 🇮🇳')}><Smile size={18}/></button><button title="Add location" onClick={() => setDraft(d => d + ' 📍India')}><MapPin size={18}/></button><span className="char-count">{draft.length}/280</span></div><button className="small-primary" disabled={!draft.trim()} onClick={publish}>Post</button></div>
        </div>
      </section>}
      {active === 'Explore' && !search && <section className="explore-hero"><div className="explore-icon"><Sparkles size={21}/></div><div><div className="font-bold">Explore Bharat</div><p>Fresh conversations from across India.</p></div><span className="explore-flag">🇮🇳</span></section>}
      {active === 'Notifications' && !search && <div className="notification-list">{notifications.map(n => <div key={n.id} className={`notification-row ${!n.read ? 'unread' : ''}`}><Avatar initials={n.initials} color={n.color}/><div className="notification-copy"><p>{n.text}</p><span>{n.time} ago</span></div>{n.type === 'like' ? <Heart size={17} className="notification-icon heart-fill"/> : n.type === 'follow' ? <Users size={17} className="notification-icon"/> : <MessageCircle size={17} className="notification-icon"/>}</div>)}</div>}
      {active === 'Messages' && !search && <div className="empty-state"><div className="empty-icon"><Mail size={26}/></div><h3>Your conversations start here</h3><p>Direct messaging is planned for the full product. This prototype focuses on the public conversation experience.</p><button className="small-primary" onClick={() => navTo('Explore')}>Explore people</button></div>}
      {active === 'Profile' && !search && <section className="profile-card"><div className="profile-cover"><span>भारत • Bharat</span></div><div className="profile-details">
  <Avatar initials={currentUser ? (currentUser.display_name || currentUser.username || 'Y').slice(0,2).toUpperCase() : 'Y'} color="blue" size="lg"/>
  <button className="outline-button" onClick={() => flash('Profile editing will be available in the full app.')}>Edit profile</button>
  <h2>{currentUser ? (currentUser.display_name || currentUser.username) : 'Your profile'}</h2>
  <p className="text-muted">{currentUser ? `@${currentUser.username}` : '@you'}</p>
  <p className="profile-bio">{currentUser ? (currentUser.bio || 'No bio yet.') : 'Building something for Bharat. 🇮🇳'}</p>
  <div className="profile-stats"><span><b>{currentUser ? currentUser.following_count : 0}</b> Following</span><span><b>{currentUser ? currentUser.followers_count : 0}</b> Followers</span></div>
</div><div className="profile-tabs">{['Posts','Replies','Media','Likes'].map(t => <button key={t} className={profileTab===t?'selected':''} onClick={() => setProfileTab(t)}>{t}</button>)}</div></section>}
      {(active === 'Explore' && !search) && <div className="trend-list"><div className="section-label">Trending across India <TrendingUp size={16}/></div>{trends.map((t,i)=><button key={t.tag} className="trend-row" onClick={() => setSearch(t.tag.replace('#',''))}><div><span>{t.category}</span><strong>{t.tag}</strong><small>{t.posts}</small></div><MoreHorizontal size={18}/></button>)}</div>}
      {active === 'Explore' && !search && <div className="people-inline"><div className="section-label">People to follow <Users size={16}/></div>{people.map(p=><div className="suggestion-row" key={p.handle}><Avatar initials={p.avatar} color={p.color}/><div className="suggestion-info"><strong>{p.name}</strong><span>{p.handle}</span><small>{p.bio}</small></div><button className={`follow-button ${following[p.handle]?'is-following':''}`} onClick={() => setFollowing(f => ({...f,[p.handle]:!f[p.handle]}))}>{following[p.handle]?'Following':'Follow'}</button></div>)}</div>}
      {active === 'Bookmarks' && !search && <div className="inline-note"><Bookmark size={16}/> Your saved posts live here. Remove a bookmark using the ribbon icon on any post.</div>}
      {active === 'Notifications' && !search && <div className="inline-note"><Check size={16}/> Notifications are marked as read when you open this section.</div>}
      {(active !== 'Notifications' && active !== 'Messages' && !(active === 'Explore' && !search)) && <div className="post-list">
        {shownPosts.length ? shownPosts.map(post => <article className="post-card" key={post.id} style={{perspective: '800px', transformStyle: 'preserve-3d'}}>
          <Avatar initials={post.avatar} color={post.color}/>
          <div className="post-content">
            <div className="post-meta"><strong>{post.name}</strong>{post.verified && <BadgeCheck size={15} className="verified"/>}<span>{post.handle}</span><span>·</span><span>{post.time}</span><button className="post-more" onClick={() => flash('More post actions will be available in the full app.')}><MoreHorizontal size={19}/></button></div>
            <p className="post-text">{post.text}</p>
            {post.tags.length > 0 && <div className="post-tags">{post.tags.map(tag => <button key={tag} onClick={() => setSearch(tag.replace('#',''))}>{tag.startsWith('#')?tag:`#${tag}`}</button>)}</div>}
            <div className="post-location"><MapPin size={12}/>{post.location}</div>
            {replyTo === post.id && <div className="reply-box"><input value={replyDraft} onChange={e=>setReplyDraft(e.target.value)} placeholder={`Reply to ${post.name}...`} onKeyDown={e=>e.key==='Enter'&&doReply(post.id)}/><button onClick={()=>doReply(post.id)}><Send size={15}/></button></div>}
            <div className="post-actions">
              <button className="action-reply" onClick={() => setReplyTo(replyTo===post.id?null:post.id)}><MessageCircle size={17}/><span>{post.replies}</span></button>
              <button className={post.reposted?'action-reposted':''} onClick={async () => {
                  if (!getAccessToken()) { setAuthOpen(true); return flash('Sign in to repost.') }
                  const next = !post.reposted
                  if (post.backendId) {
                    try { await api.repost(post.backendId, next) } catch (err) { return flash(err.message || 'Could not update repost.') }
                  }
                  togglePost(post.id, 'reposted', 'reposts')
                }}><Repeat2 size={17}/><span>{post.reposts}</span></button>
              <button className={post.liked?'action-liked':''} onClick={async () => {
                if (!getAccessToken()) { setAuthOpen(true); return flash('Sign in to like posts.') }
                const next = !post.liked
                if (post.backendId) {
                  try { await api.like(post.backendId, next); } catch (err) { return flash(err.message || 'Could not update like.') }
                }
                togglePost(post.id,'liked','likes')
              }}><Heart size={17} fill={post.liked?'currentColor':'none'}/><span>{post.likes}</span></button>
              <button className={post.saved?'action-saved':''} onClick={async () => {
                if (!getAccessToken()) { setAuthOpen(true); return flash('Sign in to save posts.') }
                if (!post.backendId) return flash('Only live posts can be saved to your account.')
                try { await api.bookmark(post.backendId, !post.saved); togglePost(post.id,'saved'); flash(post.saved?'Removed from bookmarks':'Saved to bookmarks') }
                catch (err) { flash(err.message || 'Could not update bookmark.') }
              }}><Bookmark size={17} fill={post.saved?'currentColor':'none'}/></button>
              <button onClick={() => {if(navigator.share) navigator.share({title:`${post.name} on BharatConnect`,text:post.text}).catch(()=>{}); else flash('Share link copied in a full implementation.')}}><Share2 size={16}/></button>
            </div>
          </div>
        </article>) : <div className="empty-state"><div className="empty-icon"><Hash size={26}/></div><h3>{active === 'Bookmarks' ? 'No saved posts yet' : search ? 'No results found' : 'Your timeline is waiting'}</h3><p>{active === 'Bookmarks' ? 'Tap the bookmark icon on a post to save it for later.' : 'Try another search or explore conversations from across India.'}</p><button className="small-primary" onClick={() => navTo('Explore')}>Explore Bharat</button></div>}
      </div>}
      <footer className="mobile-bottom-nav">{nav.filter(n=>['Home','Explore','Notifications','Bookmarks','Profile'].includes(n.label)).map(({label,icon:Icon,count})=><button key={label} onClick={()=>navTo(label)} className={active===label?'mobile-nav-active':''}><Icon size={21}/>{count>0&&<i/>}</button>)}</footer>
    </main>
    <aside className="right-sidebar">
      <div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search BharatConnect"/></div>
      <section className="right-card welcome-card"><div className="welcome-top"><div className="welcome-spark"><Sparkles size={18}/></div><span>WELCOME TO BHARAT</span></div><h2>Every voice has a place.</h2><p>Join conversations that connect our languages, cities and ideas.</p><button onClick={() => setShowComposer(true)}>Start a conversation <Plus size={16}/></button><div className="welcome-deco">नमस्ते <span>🇮🇳</span></div></section>
      <section className="right-card"><div className="right-card-title"><h3>What’s happening</h3><Flame size={18}/></div>{trends.slice(0,3).map((t,i)=><button className="right-trend" key={t.tag} onClick={()=>setSearch(t.tag.replace('#',''))}><span>{t.category}</span><strong>{t.tag}</strong><small>{t.posts}</small><MoreHorizontal size={17}/></button>)}<button className="show-more" onClick={()=>navTo('Explore')}>Show more</button></section>
      <section className="right-card"><div className="right-card-title"><h3>Who to follow</h3><Users size={18}/></div>{people.slice(0,2).map(p=><div className="right-person" key={p.handle}><Avatar initials={p.avatar} color={p.color}/><div className="right-person-info"><strong>{p.name}</strong><span>{p.handle}</span></div><button className={`follow-button ${following[p.handle]?'is-following':''}`} onClick={()=>setFollowing(f=>({...f,[p.handle]:!f[p.handle]}))}>{following[p.handle]?'Following':'Follow'}</button></div>)}<button className="show-more" onClick={()=>navTo('Explore')}>Discover people</button></section>
      <div className="legal-links"><button onClick={()=>flash('Privacy policy page is planned for launch.')}>Privacy</button><span>·</span><button onClick={()=>flash('Terms page is planned for launch.')}>Terms</button><span>·</span><button onClick={()=>flash('Help centre is planned for launch.')}>Help</button><span>·</span><span>© 2026 BharatConnect</span></div>
      <div className="prototype-label"><span></span> Community-powered · BharatConnect</div>
    </aside>
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess}/>}
    {showComposer && <div className="modal-backdrop" onClick={()=>setShowComposer(false)}><div className="compose-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>Start a conversation</h2><button className="icon-button" onClick={()=>setShowComposer(false)}><X size={19}/></button></div><div className="modal-compose"><Avatar initials="Y" color="blue" size="lg"/><textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What would you like Bharat to hear?" maxLength={280}/></div><div className="modal-footer"><span>{draft.length}/280 characters</span><button className="small-primary" disabled={!draft.trim()} onClick={publish}>Publish post</button></div></div></div>}
    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
  </div>
}
export default App
