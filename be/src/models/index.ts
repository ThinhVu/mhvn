import {getColl} from "../plugins/mongodb";
import {IAdminUser} from "./admin-user";
import {IAnnouncement} from "./announcement";
import {IAPIMetric} from "./metric/api-metric";
import {IAppMetric} from "./metric/app-metric";
import {IDAU} from "./metric/DAU";
import {IDbMigrateHistory} from "./db-migrate-history";
import {IFile} from "./file-system/file";
import {IFolder} from "./file-system/folder";
import {IHealthCheck} from "./health-check";
import {II18n} from "./i18n";
import {IKV} from "./kv";
import {IMAU} from "./metric/MAU";
import {INotification} from "./notification";
import {ITask} from "./tasks";
import {IUserLoginHistory} from "./metric/user-login-history";
import {IUserMetric} from "./metric/user-metric";
import {IUser} from "./user";
import {IVerification} from "./verification";
import {IWAU} from "./metric/WAU";
import {IStorage} from "./storage";

export const CollNames = {
  AdminUsers: 'adminusers',
  Announcements: 'announcements',
  ApiMetrics: 'apimetrics',
  AppMetrics: 'appmetrics',
  DailyActiveUsers: 'daus',
  DbMigrateHistories: 'dbmigratehistories',
  Files: 'files',
  Folders: 'folders',
  HealthChecks: 'healthchecks',
  I18ns: 'i18ns',
  KVs: 'kvs',
  Storages: 'storages',
  MonthlyActiveUsers: 'maus',
  Notifications: 'notifications',
  Tasks: 'tasks',
  UserLoginHistories: 'userloginhistories',
  UserMetrics: 'usermetrics',
  Users: 'users',
  Verifications: 'verifications',
  WeeklyActiveUsers: 'waus',
};

export const Model = {
  get AdminUsers() {
    return getColl<IAdminUser>(CollNames.AdminUsers)
  },
  get Announcements() {
    return getColl<IAnnouncement>(CollNames.Announcements)
  },
  get ApiMetrics() {
    return getColl<IAPIMetric>(CollNames.ApiMetrics)
  },
  get AppMetrics() {
    return getColl<IAppMetric>(CollNames.AppMetrics)
  },
  get DailyActiveUsers() {
    return getColl<IDAU>(CollNames.DailyActiveUsers)
  },
  get DbMigrateHistories() {
    return getColl<IDbMigrateHistory>(CollNames.DbMigrateHistories)
  },
  get Files() {
    return getColl<IFile>(CollNames.Files)
  },
  get Folders() {
    return getColl<IFolder>(CollNames.Folders)
  },
  get HealthChecks() {
    return getColl<IHealthCheck>(CollNames.HealthChecks)
  },
  get I18ns() {
    return getColl<II18n>(CollNames.I18ns)
  },
  get KVs() {
    return getColl<IKV>(CollNames.KVs)
  },
  get Storages() {
    return getColl<IStorage>(CollNames.Storages)
  },
  get MonthlyActiveUsers() {
    return getColl<IMAU>(CollNames.MonthlyActiveUsers)
  },
  get Notifications() {
    return getColl<INotification>(CollNames.Notifications)
  },
  get Tasks() {
    return getColl<ITask>(CollNames.Tasks)
  },
  get UserLoginHistories() {
    return getColl<IUserLoginHistory>(CollNames.UserLoginHistories)
  },
  get UserMetrics() {
    return getColl<IUserMetric>(CollNames.UserMetrics)
  },
  get Users() {
    return getColl<IUser>(CollNames.Users)
  },
  get Verifications() {
    return getColl<IVerification>(CollNames.Verifications)
  },
  get WeeklyActiveUsers() {
    return getColl<IWAU>(CollNames.WeeklyActiveUsers)
  }
}