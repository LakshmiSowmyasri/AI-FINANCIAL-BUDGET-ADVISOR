import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaHome,
  FaWallet,
  FaChartPie,
  FaChartLine,
  FaUsers,
  FaRobot,
  FaUser,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaBell,
  FaChartBar,
  FaSearch,
  FaBullseye,
  FaFileAlt,
  FaSun,
  FaMoon,
  FaCheck
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--bg-canvas);
  color: var(--text-main);
`;

const Sidebar = styled(motion.aside)`
  width: ${props => props.isOpen ? '260px' : '80px'};
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Logo = styled.div`
  padding: 22px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  
  .logo-icon {
    width: 38px;
    height: 38px;
    background: var(--gradient-emerald);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 19px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
  }
  
  .logo-text {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    white-space: nowrap;

    .brand {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .badge {
      font-size: 10px;
      font-weight: 600;
      color: var(--secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
  }
`;

const NavContainer = styled.nav`
  flex: 1;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s ease;
  position: relative;
  
  .nav-left {
    display: flex;
    align-items: center;
    gap: 12px;

    svg {
      font-size: 17px;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }

    span {
      white-space: nowrap;
      overflow: hidden;
    }
  }

  .ai-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(--ai-bg);
    color: var(--ai-accent);
    border: 1px solid var(--ai-border);
    letter-spacing: 0.04em;
  }
  
  &:hover {
    background: var(--primary-subtle);
    color: var(--primary);

    svg {
      color: var(--primary);
    }
  }

  &.ai-item:hover {
    background: var(--ai-bg);
    color: var(--ai-accent);

    svg {
      color: var(--ai-accent);
    }
  }
  
  &.active {
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    box-shadow: 0 4px 14px rgba(5, 150, 105, 0.2);

    svg {
      color: var(--btn-primary-text);
    }

    .ai-tag {
      background: rgba(16, 24, 21, 0.2);
      color: #ffffff;
      border-color: transparent;
    }
  }

  &.active.ai-item {
    background: var(--btn-ai-bg);
    color: var(--btn-ai-text);
    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);

    svg {
      color: var(--btn-ai-text);
    }
  }
`;

const BottomSection = styled.div`
  padding: 16px 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--error);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: var(--error-subtle);
    border-color: rgba(248, 113, 113, 0.2);
  }
  
  svg {
    font-size: 16px;
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.sidebarWidth};
  padding: 28px 32px;
  min-height: 100vh;
  transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const TopBar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 14px 22px;
  background: var(--bg-surface);
  border-radius: 14px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  gap: 16px;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;

  .page-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: -0.01em;

    @media (max-width: 640px) {
      display: none;
    }
  }
`;

const MenuButton = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 20px;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  
  &:hover {
    background: var(--border-subtle);
  }

  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SearchBar = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 260px;
  flex: 1;
  max-width: 420px;

  @media (max-width: 640px) {
    display: none;
  }

  svg {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
    font-size: 14px;
  }

  input {
    width: 100%;
    padding: 8px 12px 8px 34px;
    background: var(--bg-canvas);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text-main);
    font-size: 13px;
    transition: all 0.2s ease;

    &::placeholder {
      color: var(--text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-subtle);
    }
  }
`;

const SearchResults = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 300;
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);

  .heading, .message {
    padding: 9px 10px;
    color: var(--text-muted);
    font-size: 12px;
  }

  .heading {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
`;

const SearchResult = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;

  &:hover, &:focus-visible {
    outline: none;
    background: var(--primary-subtle);
  }

  .title { font-size: 13px; font-weight: 600; }
  .detail { color: var(--text-muted); font-size: 11px; }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NotificationContainer = styled.div`
  position: relative;
`;

const NotificationBadge = styled.button`
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  
  &:hover {
    color: var(--text-main);
    border-color: var(--secondary);
  }
  
  .badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--error);
    border-radius: 50%;
    color: white;
    font-size: 10px;
    font-weight: 700;
  }
`;

const NotificationPanel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 300;
  width: min(360px, calc(100vw - 32px));
  max-height: 420px;
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);

  .header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 15px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    color: var(--text-main);
    font-size: 13px;
    font-weight: 700;
  }

  .header button {
    border: 0;
    background: transparent;
    color: var(--primary);
    font-size: 11px;
    cursor: pointer;
  }

  .empty, .error {
    padding: 22px 16px;
    color: var(--text-muted);
    font-size: 12px;
    text-align: center;
  }

  .error { color: var(--error); }
`;

const NotificationItem = styled.button`
  width: 100%;
  display: block;
  padding: 12px 15px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: ${p => p.unread ? 'var(--primary-subtle)' : 'transparent'};
  color: var(--text-main);
  text-align: left;
  cursor: pointer;

  &:hover { background: var(--bg-surface-elevated); }

  .title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
  }

  .message {
    margin-top: 4px;
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .date {
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 10px;
  }
`;

const UnreadDot = styled.span`
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: var(--primary);
`;

const NotificationActions = styled.div`
  padding: 9px 15px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
`;

const ThemeToggle = styled.button`
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  color: var(--text-main);
  font-size: 15px;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--bg-canvas);
  border: 1px solid var(--border);
  border-radius: 10px;
  
  .avatar {
    width: 32px;
    height: 32px;
    background: var(--gradient-emerald);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
    font-size: 13px;
  }
  
  .user-details {
    .name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.2;
    }
    .role {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.2;
    }
  }
`;

const navItems = [
  { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
  { path: '/expenses', icon: FaWallet, label: 'Expenses' },
  { path: '/budget', icon: FaChartPie, label: 'Budget' },
  { path: '/goals', icon: FaBullseye, label: 'Savings Goals' },
  { path: '/investments', icon: FaChartLine, label: 'Investments' },
  { path: '/market', icon: FaChartBar, label: 'Market' },
  { path: '/report', icon: FaFileAlt, label: 'Monthly Report', isAi: true },
  { path: '/family', icon: FaUsers, label: 'Family' },
  { path: '/chat', icon: FaRobot, label: 'AI Advisor', isAi: true },
  { path: '/profile', icon: FaUser, label: 'Profile' },
];

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const currentNav = navItems.find(item => item.path === location.pathname) || { label: 'Dashboard' };

  useEffect(() => {
    let active = true;
    const query = searchTerm.trim();

    if (!query) {
      setSearchMatches([]);
      setSearchLoading(false);
      setSearchError('');
      return undefined;
    }

    const normalizedQuery = query.toLowerCase();
    const pageMatches = navItems
      .filter(item => item.label.toLowerCase().includes(normalizedQuery))
      .map(item => ({
        key: `page-${item.path}`,
        title: item.label,
        detail: 'Go to page',
        path: item.path
      }));

    setSearchMatches(pageMatches);
    setSearchError('');
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const responses = await Promise.allSettled([
          api.get('/expenses', { params: { limit: 100 } }),
          api.get('/budget/categories'),
          api.get('/goals')
        ]);

        if (!active) return;

        const failures = responses.filter(result => result.status === 'rejected');
        const matches = [...pageMatches];
        const includesQuery = value => String(value || '').toLowerCase().includes(normalizedQuery);

        if (responses[0].status === 'fulfilled') {
          (responses[0].value.data.expenses || [])
            .filter(expense => [expense.description, expense.merchant, expense.notes, expense.category_name]
              .some(includesQuery))
            .slice(0, 5)
            .forEach(expense => matches.push({
              key: `expense-${expense.id}`,
              title: expense.description || expense.merchant || 'Expense',
              detail: `${expense.category_name || 'Uncategorized'} · ₹${Number(expense.amount || 0).toLocaleString('en-IN')}`,
              path: `/expenses?search=${encodeURIComponent(query)}`
            }));
        }

        if (responses[1].status === 'fulfilled') {
          (responses[1].value.data.categories || [])
            .filter(category => includesQuery(category.name))
            .slice(0, 4)
            .forEach(category => matches.push({
              key: `category-${category.id}`,
              title: category.name,
              detail: 'Budget category',
              path: '/budget'
            }));
        }

        if (responses[2].status === 'fulfilled') {
          (responses[2].value.data.goals || [])
            .filter(goal => [goal.name, goal.category].some(includesQuery))
            .slice(0, 4)
            .forEach(goal => matches.push({
              key: `goal-${goal.id}`,
              title: goal.name,
              detail: `Savings goal · ${goal.progressPercent || 0}% complete`,
              path: '/goals'
            }));
        }

        setSearchMatches(matches.slice(0, 10));
        if (failures.length === responses.length) {
          setSearchError('Could not search saved items. Check your connection and try again.');
        } else if (failures.length > 0) {
          setSearchError('Some saved items could not be searched.');
        }
      } catch (error) {
        if (active) {
          setSearchError(error.response?.data?.error || 'Could not search saved items. Please try again.');
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    setNotificationError('');
    try {
      const { data } = await api.get('/notifications');
      setNotifications((data.notifications || []).map(notification => ({
        ...notification,
        is_read: Boolean(Number(notification.is_read))
      })));
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (error) {
      setNotificationError(error.response?.data?.error || 'Could not load notifications. Please try again.');
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const selectSearchMatch = match => {
    setIsSearchOpen(false);
    setSearchTerm('');
    navigate(match.path);
  };

  const markNotificationRead = async notification => {
    if (!Boolean(Number(notification.is_read))) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(items => items.map(item =>
          item.id === notification.id ? { ...item, is_read: 1 } : item
        ));
        setUnreadCount(count => Math.max(0, count - 1));
      } catch (error) {
        toast.error(error.response?.data?.error || 'Could not mark notification as read');
        return;
      }
    }
    if (notification.action_url) {
      setIsNotificationsOpen(false);
      if (notification.action_url.startsWith('/')) navigate(notification.action_url);
      else window.location.assign(notification.action_url);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(items => items.map(item => ({ ...item, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not mark notifications as read');
    }
  };

  return (
    <LayoutContainer>
      <Sidebar isOpen={isSidebarOpen}>
        <Logo>
          <div className="logo-icon">₹</div>
          {isSidebarOpen && (
            <div className="logo-text">
              <span className="brand">BudgetAI</span>
              <span className="badge">Fintech Advisor</span>
            </div>
          )}
        </Logo>
        
        <NavContainer>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={item.isAi ? 'ai-item' : ''}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <div className="nav-left">
                <item.icon />
                {isSidebarOpen && <span>{item.label}</span>}
              </div>
              {isSidebarOpen && item.isAi && (
                <span className="ai-tag">AI</span>
              )}
            </NavItem>
          ))}
        </NavContainer>
        
        <BottomSection>
          <LogoutButton onClick={logout} title={!isSidebarOpen ? 'Logout' : undefined}>
            <FaSignOutAlt />
            {isSidebarOpen && <span>Logout</span>}
          </LogoutButton>
        </BottomSection>
      </Sidebar>

      <MainContent sidebarWidth={isSidebarOpen ? '260px' : '80px'}>
        <TopBar>
          <LeftSection>
            <MenuButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle menu">
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </MenuButton>
            <div className="page-title">{currentNav.label}</div>
          </LeftSection>

          <SearchBar>
            <FaSearch />
            <input
              type="search"
              placeholder="Search transactions, budgets..."
              value={searchTerm}
              aria-label="Search transactions, budgets, and savings goals"
              onFocus={() => setIsSearchOpen(true)}
              onChange={event => {
                setSearchTerm(event.target.value);
                setIsSearchOpen(true);
              }}
              onKeyDown={event => {
                if (event.key === 'Escape') setIsSearchOpen(false);
                if (event.key === 'Enter' && searchMatches[0]) selectSearchMatch(searchMatches[0]);
              }}
            />
            {isSearchOpen && searchTerm.trim() && (
              <SearchResults>
                <div className="heading">Search results</div>
                {searchMatches.map(match => (
                  <SearchResult key={match.key} type="button" onClick={() => selectSearchMatch(match)}>
                    <span className="title">{match.title}</span>
                    <span className="detail">{match.detail}</span>
                  </SearchResult>
                ))}
                {searchLoading && <div className="message">Searching saved items…</div>}
                {!searchLoading && !searchMatches.length && !searchError && (
                  <div className="message">No matching pages or saved items.</div>
                )}
                {searchError && <div className="message">{searchError}</div>}
              </SearchResults>
            )}
          </SearchBar>
          
          <RightSection>
            <ThemeToggle onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {isDark ? <FaSun /> : <FaMoon />}
            </ThemeToggle>

            <NotificationContainer>
              <NotificationBadge
                type="button"
                title="Notifications"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  const opening = !isNotificationsOpen;
                  setIsNotificationsOpen(opening);
                  if (opening) loadNotifications();
                }}
              >
                <FaBell />
                {unreadCount > 0 && <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </NotificationBadge>
              {isNotificationsOpen && (
                <NotificationPanel>
                  <div className="header">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllNotificationsRead}>Mark all as read</button>
                    )}
                  </div>
                  {notificationLoading && <div className="empty">Loading notifications…</div>}
                  {!notificationLoading && notificationError && (
                    <div className="error" role="alert">{notificationError}</div>
                  )}
                  {!notificationLoading && !notificationError && notifications.length === 0 && (
                    <div className="empty">You’re all caught up. No notifications yet.</div>
                  )}
                  {!notificationLoading && !notificationError && notifications.map(notification => {
                    const isRead = Boolean(Number(notification.is_read));
                    return (
                      <NotificationItem
                        key={notification.id}
                        type="button"
                        unread={!isRead}
                        onClick={() => markNotificationRead(notification)}
                      >
                        <div className="title">
                          {!isRead && <UnreadDot />}
                          {notification.title}
                        </div>
                        <div className="message">{notification.message}</div>
                        {notification.created_at && (
                          <div className="date">{new Date(notification.created_at).toLocaleString()}</div>
                        )}
                      </NotificationItem>
                    );
                  })}
                  {!notificationLoading && !notificationError && notifications.length > 0 && (
                    <NotificationActions>
                      {unreadCount > 0 ? `${unreadCount} unread` : <><FaCheck /> All caught up</>}
                    </NotificationActions>
                  )}
                </NotificationPanel>
              )}
            </NotificationContainer>
            
            <UserInfo>
              <div className="avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="name">{user?.name || 'User'}</div>
                <div className="role">{user?.email || 'user@example.com'}</div>
              </div>
            </UserInfo>
          </RightSection>
        </TopBar>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;
