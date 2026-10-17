import type { EndpointDefinition } from '../server/backend.js';

import adminAnnouncements from './adminAnnouncements.js';
import adminAudit from './adminAudit.js';
import adminCms from './adminCms.js';
import adminCollections from './adminCollections.js';
import adminDashboard from './adminDashboard.js';
import adminMedia from './adminMedia.js';
import adminMemberAction from './adminMemberAction.js';
import adminMemberBulk from './adminMemberBulk.js';
import adminMemberCreate from './adminMemberCreate.js';
import adminMembers from './adminMembers.js';
import adminPosts from './adminPosts.js';
import adminSettings from './adminSettings.js';
import adminTracks from './adminTracks.js';
import appLibrary from './appLibrary.js';
import appNotifications from './appNotifications.js';
import authChangePassword from './authChangePassword.js';
import authLogin from './authLogin.js';
import authLogout from './authLogout.js';
import authMe from './authMe.js';
import authSessions from './authSessions.js';
import bodyyarAi from './bodyyarAi.js';
import bodyyarChat from './bodyyarChat.js';
import bodyyarPlan from './bodyyarPlan.js';
import bodyyarProfile from './bodyyarProfile.js';
import bodyyarWeightLog from './bodyyarWeightLog.js';
import bodyyarWorkoutLog from './bodyyarWorkoutLog.js';
import kapooshProducts from './kapooshProducts.js';
import morshedTracks from './morshedTracks.js';
import publicCms from './publicCms.js';
import publicPosts from './publicPosts.js';
import publicSettings from './publicSettings.js';

/** Every callable endpoint of the Kayar API. The name is the RPC route name. */
export const endpoints: Record<string, EndpointDefinition<any, any>> = {
  adminAnnouncements, adminAudit, adminCms, adminCollections, adminDashboard, adminMedia,
  adminMemberAction, adminMemberBulk, adminMemberCreate, adminMembers, adminPosts, adminSettings,
  adminTracks, appLibrary, appNotifications, authChangePassword, authLogin, authLogout, authMe,
  authSessions, bodyyarAi, bodyyarChat, bodyyarPlan, bodyyarProfile, bodyyarWeightLog, bodyyarWorkoutLog,
  kapooshProducts, morshedTracks, publicCms, publicPosts, publicSettings,
};

export const endpointNames = Object.keys(endpoints);
