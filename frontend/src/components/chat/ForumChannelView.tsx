import React, { useState, useEffect } from 'react';
import { 
  MessagesSquare, Plus, Search, MessageCircle, Send, ArrowLeft 
} from 'lucide-react';
import type { Channel, User } from '../../types/chat';

export interface ForumPost {
  id: string;
  channelId: number;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  tag: string;
  createdAt: string;
  comments: ForumComment[];
}

export interface ForumComment {
  id: string;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

const FORUM_STORAGE_KEY = 'discord_mini_forum_posts_v1';
const FORUM_TAGS = ['Tất cả', 'Thảo luận', 'Hỏi đáp', 'Chia sẻ', 'Thông báo', 'Góp ý'];

interface Props {
  channel: Channel;
  currentUser: User | null;
}

export const ForumChannelView: React.FC<Props> = ({ channel, currentUser }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('Thảo luận');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  // Tải danh sách bài viết diễn đàn từ localStorage theo kênh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORUM_STORAGE_KEY);
      if (raw) {
        const allPosts: ForumPost[] = JSON.parse(raw);
        const channelPosts = allPosts.filter(p => p.channelId === channel.id);
        if (channelPosts.length > 0) {
          setPosts(channelPosts);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Dữ liệu mẫu khởi đầu hữu ích cho diễn đàn
    const samplePosts: ForumPost[] = [
      {
        id: `post_${channel.id}_1`,
        channelId: channel.id,
        title: `Chào mừng bạn đến với Diễn đàn #${channel.name}!`,
        content: 'Đây là không gian thảo luận có tổ chức. Mọi người có thể tạo các chủ đề bài viết riêng biệt thay vì chat trôi tin nhắn để cùng nhau giải quyết vấn đề và chia sẻ tài liệu.',
        authorId: 1,
        authorName: 'Quản trị viên',
        tag: 'Thông báo',
        createdAt: 'Hôm nay lúc 09:30',
        comments: [
          {
            id: 'c_1',
            authorId: 2,
            authorName: 'Thành viên',
            content: 'Tính năng diễn đàn rất hữu ích và trực quan, giúp các chủ đề thảo luận không bị trôi như kênh chat thông thường!',
            createdAt: 'Hôm nay lúc 09:35'
          }
        ]
      }
    ];
    setPosts(samplePosts);
    saveAllPosts(samplePosts);
  }, [channel.id]);

  const saveAllPosts = (updatedChannelPosts: ForumPost[]) => {
    try {
      const raw = localStorage.getItem(FORUM_STORAGE_KEY);
      const allPosts: ForumPost[] = raw ? JSON.parse(raw) : [];
      const others = allPosts.filter(p => p.channelId !== channel.id);
      const merged = [...others, ...updatedChannelPosts];
      localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newP: ForumPost = {
      id: `post_${Date.now()}`,
      channelId: channel.id,
      title: newTitle.trim(),
      content: newContent.trim(),
      authorId: currentUser?.id || 0,
      authorName: currentUser?.displayName || currentUser?.username || 'Tôi',
      tag: newTag,
      createdAt: 'Vừa xong',
      comments: []
    };

    const nextPosts = [newP, ...posts];
    setPosts(nextPosts);
    saveAllPosts(nextPosts);
    setNewTitle('');
    setNewContent('');
    setIsCreatingPost(false);
    setActivePostId(newP.id);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostId || !newComment.trim()) return;

    const commentObj: ForumComment = {
      id: `c_${Date.now()}`,
      authorId: currentUser?.id || 0,
      authorName: currentUser?.displayName || currentUser?.username || 'Tôi',
      content: newComment.trim(),
      createdAt: 'Vừa xong'
    };

    const nextPosts = posts.map(p => {
      if (p.id === activePostId) {
        return {
          ...p,
          comments: [...p.comments, commentObj]
        };
      }
      return p;
    });

    setPosts(nextPosts);
    saveAllPosts(nextPosts);
    setNewComment('');
  };

  const filteredPosts = posts.filter(p => {
    const matchTag = selectedTag === 'Tất cả' || p.tag === selectedTag;
    const matchSearch = !searchQuery.trim() || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTag && matchSearch;
  });

  const activePost = posts.find(p => p.id === activePostId);

  // 1. GIAO DIỆN XEM CHI TIẾT 1 BÀI VIẾT THẢO LUẬN (THREAD VIEW)
  if (activePost) {
    return (
      <div className="forum-thread-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header Thread */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-1)' }}>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setActivePostId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách Diễn đàn</span>
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>|</span>
          <span className="forum-tag-badge" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            #{activePost.tag}
          </span>
        </div>

        {/* Nội dung bài viết chính + Danh sách bình luận */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Card Bài viết chính */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-header)', margin: '0 0 12px' }}>
              {activePost.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                {activePost.authorName.charAt(0).toUpperCase()}
              </div>
              <strong style={{ color: 'var(--text-normal)' }}>{activePost.authorName}</strong>
              <span>•</span>
              <span>{activePost.createdAt}</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-normal)', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
              {activePost.content}
            </p>
          </div>

          {/* Tiêu đề mục phản hồi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <MessageCircle size={16} />
            <span>Bình luận & Thảo luận ({activePost.comments.length})</span>
          </div>

          {/* Danh sách bình luận */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {activePost.comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '12px', padding: '14px', backgroundColor: 'var(--bg-1)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#4e5058', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-header)' }}>{c.authorName}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.createdAt}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-normal)', lineHeight: '1.5', margin: 0 }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))}

            {activePost.comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Chưa có bình luận nào. Hãy là người đầu tiên tham gia thảo luận chủ đề này!
              </div>
            )}
          </div>
        </div>

        {/* Ô gửi bình luận */}
        <form onSubmit={handleAddComment} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-1)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={`Trả lời thảo luận với vai trò ${currentUser?.displayName || 'Tôi'}...`}
            style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-header)', fontSize: '14px', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            style={{ padding: '10px 18px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: newComment.trim() ? 'pointer' : 'not-allowed', opacity: newComment.trim() ? 1 : 0.6, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={15} />
            <span>Gửi phản hồi</span>
          </button>
        </form>
      </div>
    );
  }

  // 2. GIAO DIỆN TỔNG QUAN DANH SÁCH BÀI VIẾT DIỄN ĐÀN (FORUM FEED)
  return (
    <div className="forum-channel-viewport" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Banner Giới thiệu Diễn đàn */}
      <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-1)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <MessagesSquare size={22} color="var(--accent)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-header)', margin: 0 }}>
              Kênh Diễn Đàn: #{channel.name}
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Tạo không gian cho những cuộc thảo luận có tổ chức theo từng chủ đề bài viết.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingPost(v => !v)}
          style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
        >
          <Plus size={16} />
          <span>Bài viết mới</span>
        </button>
      </div>

      {/* Form Tạo Bài Viết Mới */}
      {isCreatingPost && (
        <form onSubmit={handleCreatePost} style={{ margin: '16px 24px 0', padding: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-header)', margin: '0 0 12px' }}>
            Tạo chủ đề thảo luận mới
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Tiêu đề chủ đề thảo luận..."
              maxLength={100}
              autoFocus
              style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-header)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Thẻ tag:</span>
            {FORUM_TAGS.filter(t => t !== 'Tất cả').map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setNewTag(tag)}
                style={{ padding: '4px 10px', borderRadius: '4px', border: newTag === tag ? '1px solid var(--accent)' : '1px solid var(--border-color)', backgroundColor: newTag === tag ? 'var(--accent-soft)' : 'transparent', color: newTag === tag ? 'var(--accent)' : 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                #{tag}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: '14px' }}>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Chia sẻ nội dung thảo luận, đặt câu hỏi hoặc tài liệu cần bàn luận..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-header)', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setIsCreatingPost(false)}
              style={{ padding: '8px 14px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim() || !newContent.trim()}
              style={{ padding: '8px 18px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '13px', cursor: newTitle.trim() && newContent.trim() ? 'pointer' : 'not-allowed', opacity: newTitle.trim() && newContent.trim() ? 1 : 0.6 }}
            >
              Đăng chủ đề
            </button>
          </div>
        </form>
      )}

      {/* Thanh Lọc Tag & Tìm Kiếm */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1 }}>
          {FORUM_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              style={{ padding: '5px 12px', borderRadius: '16px', border: selectedTag === tag ? '1px solid var(--accent)' : '1px solid var(--border-color)', backgroundColor: selectedTag === tag ? 'var(--accent-soft)' : 'var(--bg-1)', color: selectedTag === tag ? 'var(--accent)' : 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {tag === 'Tất cả' ? tag : `#${tag}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '220px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chủ đề..."
            style={{ border: 'none', background: 'transparent', color: 'var(--text-header)', fontSize: '12px', outline: 'none', width: '100%' }}
          />
        </div>
      </div>

      {/* Danh Sách Thẻ Bài Viết (Forum Cards) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredPosts.map(post => (
          <div
            key={post.id}
            onClick={() => setActivePostId(post.id)}
            style={{ padding: '16px 18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.1s ease, border-color 0.15s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
          >
            <div style={{ flex: 1, paddingRight: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                  #{post.tag}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-header)', margin: 0 }}>
                  {post.title}
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.45' }}>
                {post.content}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Đăng bởi <strong>{post.authorName}</strong></span>
                <span>•</span>
                <span>{post.createdAt}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: 'var(--bg-1)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
              <MessageCircle size={15} />
              <span>{post.comments.length}</span>
            </div>
          </div>
        ))}

        {filteredPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            <MessagesSquare size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <h4 style={{ fontSize: '15px', color: 'var(--text-header)', margin: '0 0 6px' }}>Chưa có bài viết nào</h4>
            <p style={{ fontSize: '13px', margin: 0 }}>Hãy bấm nút "Bài viết mới" ở góc trên để tạo cuộc thảo luận đầu tiên!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumChannelView;
