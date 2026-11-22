import { lazy } from 'react';
import {
  BarChart3, Bitcoin, CreditCard, FileClock, Flame, Inbox, LayoutDashboard, Medal, MessagesSquare, Package, Radio, Settings2, ShieldCheck, Sparkles, Ticket, Users,
} from 'lucide-react';
import { P } from './permissions';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const UsersPage = lazy(() => import('../pages/Users'));
const UserDetail = lazy(() => import('../pages/UserDetail'));
const Subscriptions = lazy(() => import('../pages/Subscriptions'));
const Payments = lazy(() => import('../pages/Payments'));
const Plans = lazy(() => import('../pages/Plans'));
const Predictions = lazy(() => import('../pages/Predictions'));
const Messages = lazy(() => import('../pages/Messages'));
const Staff = lazy(() => import('../pages/Staff'));
const SiteSettings = lazy(() => import('../pages/SiteSettings'));
const Account = lazy(() => import('../pages/Account'));
const Chat = lazy(() => import('../pages/Chat'));
const SignalsPage = lazy(() => import('../pages/Signals'));
const TipsPage = lazy(() => import('../pages/Tips'));
const CodesPage = lazy(() => import('../pages/BookingCodes'));
const ContestPage = lazy(() => import('../pages/Contest'));
const CryptoPage = lazy(() => import('../pages/CryptoSignals'));

/**
 * One list drives the router, the sidebar and the permission checks.
 * `permission: 'superadmin'` means superadmins only; no permission means any staff.
 */
export const ROUTES = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: P.DASHBOARD_VIEW, element: <Dashboard />, section: 'Overview' },
  { path: '/users', label: 'Customers', icon: Users, permission: P.USERS_VIEW, element: <UsersPage />, section: 'Customers' },
  { path: '/users/:id', permission: P.USERS_VIEW, element: <UserDetail /> },
  { path: '/chat', label: 'Support chat', icon: MessagesSquare, permission: P.CHAT_RESPOND, element: <Chat />, section: 'Customers', badge: 'chat' },
  { path: '/subscriptions', label: 'Subscriptions', icon: BarChart3, permission: P.SUBSCRIPTIONS_VIEW, element: <Subscriptions />, section: 'Billing' },
  { path: '/payments', label: 'Payments', icon: CreditCard, permission: P.SUBSCRIPTIONS_VIEW, element: <Payments />, section: 'Billing' },
  { path: '/plans', label: 'Plans', icon: Package, permission: P.PLANS_MANAGE, element: <Plans />, section: 'Billing' },
  { path: '/predictions', label: 'Predictions', icon: Sparkles, permission: P.PREDICTIONS_MANAGE, element: <Predictions />, section: 'Activity' },
  { path: '/tips', label: 'Sports tips', icon: Flame, permission: P.TIPS_MANAGE, element: <TipsPage />, section: 'Activity' },
  { path: '/codes', label: 'Booking codes', icon: Ticket, permission: P.CODES_MANAGE, element: <CodesPage />, section: 'Activity' },
  { path: '/contest', label: 'Picks contest', icon: Medal, permission: P.CONTEST_MANAGE, element: <ContestPage />, section: 'Activity' },
  { path: '/crypto', label: 'Crypto signals', icon: Bitcoin, permission: P.CRYPTO_SIGNALS, element: <CryptoPage />, section: 'Activity' },
  { path: '/signals', label: 'Signals', icon: Radio, permission: P.PREDICTIONS_MANAGE, element: <SignalsPage />, section: 'Activity' },
  { path: '/messages', label: 'Messages', icon: Inbox, permission: P.MESSAGES_VIEW, element: <Messages />, section: 'Activity' },
  { path: '/staff', label: 'Staff', icon: ShieldCheck, permission: 'superadmin', element: <Staff />, section: 'System' },
  { path: '/settings', label: 'Site settings', icon: Settings2, permission: P.SETTINGS_MANAGE, element: <SiteSettings />, section: 'System' },
  { path: '/account', label: 'My account', icon: FileClock, element: <Account /> },
];

export const NAV_SECTIONS = ['Overview', 'Customers', 'Billing', 'Activity', 'System'];
