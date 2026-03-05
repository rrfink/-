-- Database Backup
-- Generated: 2026-03-04 14:28:26
-- Database: SQLite


-- Table structure for table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , name TEXT NOT NULL DEFAULT '');

-- Dumping data for table `users`
INSERT INTO `users` (`id`, `phone`, `password`, `created_at`, `name`) VALUES ('18079559626', '18079559626', '222222', '2026-02-23 15:33:51', '');
INSERT INTO `users` (`id`, `phone`, `password`, `created_at`, `name`) VALUES ('13320057022', '13320057022', '111111', '2026-02-26 11:58:04', '朱继凤');
INSERT INTO `users` (`id`, `phone`, `password`, `created_at`, `name`) VALUES ('19198021729', '19198021729', '123456', '2026-03-02 05:08:05', '19198021729');


-- Table structure for table `projects`
DROP TABLE IF EXISTS `projects`;
CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            description TEXT,
            `order` INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, personalInfo TEXT, workHours TEXT, createdAt TEXT, updatedAt TEXT, isEnded INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `projects`
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1768400766393', '18079559626', '新人民医院', '江西省樟树市中建三局项目部', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u9648\u540e\u4f1f ","phone":"18257875571"}', '{"morningStart":"07:30","morningEnd":"11:30","afternoonStart":"13:00","afternoonEnd":"17:00"}', NULL, NULL, '0');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770286587197', '18079559626', '第二幼儿园', '江西省袁州区第二幼儿园', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5f20\u6d2a\u519b","type":"\u65bd\u5de5\u5458\u5e26\u4e00\u5c0f\u5de5","wage":18007958694,"phone":"18007958694","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770362921845', '18079559626', '时代天樾', '江西省宜春市袁州区学府路666号', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5510\u575a","type":"\u65bd\u5de5\u5458","wage":18079509218,"phone":"18079509218","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770368596169', '18079559626', '城北佳园', '江西省万载县', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5f20\u6d2a\u519b","type":"\u6280\u672f\u5458","wage":18007958694,"phone":"18007958694","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770368709785', '18079559626', '樾江南', '江西省宜春市', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5f20\u6d2a\u519b","type":"\u5b8c\u6574\u5de5\u7a0b","wage":18007958694,"phone":"18007958694","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770368744553', '18079559626', '秀江南', '江西省宜春市', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5f20\u6d2a\u519b","type":"\u6280\u672f\u5458","wage":18007958694,"phone":"18007958694","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770368857589', '18079559626', '华地禧园', '江西省宜春市', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u5f20\u6d2a\u519b","type":"\u65bd\u5de5\u52a0\u6280\u672f","wage":18007958694,"phone":"18007958694","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"12","afternoonEnd":"18","morningStart":"08","morningEndMin":"00","afternoonStart":"14","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');
INSERT INTO `projects` (`id`, `user_id`, `name`, `address`, `description`, `order`, `created_at`, `personalInfo`, `workHours`, `createdAt`, `updatedAt`, `isEnded`) VALUES ('project_1770369021757', '18079559626', '万载中专', '江西省宜春市', NULL, '0', '2026-03-03 19:37:43', '{"name":"\u9648\u540e\u4f1f","type":"\u5b89\u88c5\u5de5","wage":18257875571,"phone":"18257875571","noOvertimePay":true,"overtimeRateHoliday":3,"overtimeRateWeekday":1.5,"overtimeRateWeekend":2}', '{"morningEnd":"11","afternoonEnd":"17","morningStart":"07","morningEndMin":"00","afternoonStart":"13","afternoonEndMin":"00","morningStartMin":"00","afternoonStartMin":"00"}', NULL, NULL, '1');


-- Table structure for table `attendance`
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE attendance (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            date TEXT NOT NULL,
            clockIn TEXT,
            clockOut TEXT,
            workHours REAL DEFAULT 0,
            restHours REAL DEFAULT 0,
            overtimeHours REAL DEFAULT 0,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL DEFAULT 'normal', remark TEXT, overtime REAL DEFAULT 0, overtimeType TEXT DEFAULT 'weekday', updatedAt TEXT, checkIn TEXT, checkOut TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `attendance`
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-31', '18079559626', 'project_1768400766393', '2026-01-31', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '面板34 模块53  3楼已做完', '0', 'weekday', '2026-02-27T15:04:12.838Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-30', '18079559626', 'project_1768400766393', '2026-01-30', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '3楼安装面板98个，模块37个', '0', 'weekday', '2026-02-27T15:04:12.712Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-29', '18079559626', 'project_1768400766393', '2026-01-29', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '4~3楼病房模块打完，单口面板安装30个，及检查', '0', 'weekday', '2026-02-27T15:04:12.588Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-28', '18079559626', 'project_1768400766393', '2026-01-28', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '5-4楼安装单口面板套装80组', '0', 'weekday', '2026-02-27T15:04:12.463Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-27', '18079559626', 'project_1768400766393', '2026-01-27', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '6-5楼安装单口面板套装76组', '0', 'weekday', '2026-02-27T15:04:12.338Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-26', '18079559626', 'project_1768400766393', '2026-01-26', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '6楼安装单口面板套装90组', '0', 'weekday', '2026-02-27T15:04:12.204Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-25', '18079559626', 'project_1768400766393', '2026-01-25', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '7楼安装单口面板套装80组', '0', 'weekday', '2026-02-27T15:04:12.083Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-24', '18079559626', 'project_1768400766393', '2026-01-24', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '4楼安装蘑菇头16个，7楼8楼安装面板100个', '0', 'weekday', '2026-02-27T15:04:11.954Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-23', '18079559626', 'project_1768400766393', '2026-01-23', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '6-4楼安装蘑菇头40个', '0', 'weekday', '2026-02-27T15:04:11.830Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-22', '18079559626', 'project_1768400766393', '2026-01-22', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '7-6楼安装蘑菇头54个', '0', 'weekday', '2026-02-27T15:04:11.704Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-21', '18079559626', 'project_1768400766393', '2026-01-21', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '7楼安装蘑菇头40个', '0', 'weekday', '2026-02-27T15:04:11.581Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-20', '18079559626', 'project_1768400766393', '2026-01-20', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'absent', '休息', '0', 'weekday', '2026-02-27T15:16:53.326Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-19', '18079559626', 'project_1768400766393', '2026-01-19', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '8-7楼安装蘑菇头37个', '0', 'weekday', '2026-02-27T15:04:11.330Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-18', '18079559626', 'project_1768400766393', '2026-01-18', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '8楼安装蘑菇头40个', '0', 'weekday', '2026-02-27T15:04:11.204Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-17', '18079559626', 'project_1768400766393', '2026-01-17', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '9-8楼安装蘑菇头36个，领料，6×0.75电线一卷200米，7号箱防水按扭一箱100个。', '0', 'weekday', '2026-02-27T15:04:11.083Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-16', '18079559626', 'project_1768400766393', '2026-01-16', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '9楼按装蘑菇头26个，领材料，工资发放表给到朱总并和項目部走现场', '0', 'weekday', '2026-02-27T15:04:10.958Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-15', '18079559626', 'project_1768400766393', '2026-01-15', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '10-9楼安装蘑菇头42个', '0', 'weekday', '2026-02-27T15:04:10.838Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-14', '18079559626', 'project_1768400766393', '2026-01-14', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '10楼安装蘑菇头38个，盘线到天花里4处', '0', 'weekday', '2026-02-27T15:04:10.715Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-13', '18079559626', 'project_1768400766393', '2026-01-13', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '11-10楼蘑菇头安装36个', '0', 'weekday', '2026-02-27T15:04:10.596Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-12', '18079559626', 'project_1768400766393', '2026-01-12', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '上午一人打模块63个不包括装面板,下午穿线3人大概30多条', '0', 'weekday', '2026-02-27T15:04:10.471Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-11', '18079559626', 'project_1768400766393', '2026-01-11', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'absent', '休息', '0', 'weekday', '2026-03-01T18:58:31.751Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-10', '18079559626', 'project_1768400766393', '2026-01-10', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'absent', '休息', '0', 'weekday', '2026-02-27T15:16:50.288Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-09', '18079559626', 'project_1768400766393', '2026-01-09', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'absent', '休息', '0', 'weekday', '2026-02-27T15:16:48.384Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-08', '18079559626', 'project_1768400766393', '2026-01-08', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '2楼放线57条3人', '0', 'weekday', '2026-03-01T18:59:29.268Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-07', '18079559626', 'project_1768400766393', '2026-01-07', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '11楼安装蘑菇头38个', '0', 'weekday', '2026-02-27T15:04:09.845Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-06', '18079559626', 'project_1768400766393', '2026-01-06', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '12-11楼安装蘑菇头40个', '0', 'weekday', '2026-02-27T15:04:09.722Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-05', '18079559626', 'project_1768400766393', '2026-01-05', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '12楼安装蘑菇头39个', '0', 'weekday', '2026-02-27T15:04:09.587Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-04', '18079559626', 'project_1768400766393', '2026-01-04', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '14-13楼蘑菇头安装29个', '0', 'weekday', '2026-02-27T15:04:09.451Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-03', '18079559626', 'project_1768400766393', '2026-01-03', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '上午做模块未记量，下午装蘑菇头13个', '0', 'weekday', '2026-02-27T15:04:09.321Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-02', '18079559626', 'project_1768400766393', '2026-01-02', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', '住院部15楼14楼装磨菇头38个2人，并兼顾领材料', '0', 'weekday', '2026-02-27T15:04:09.198Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-01-01', '18079559626', 'project_1768400766393', '2026-01-01', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'absent', '放假', '0', 'weekday', '2026-02-27T15:16:38.516Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-31', '18079559626', 'project_1768400766393', '2026-03-31', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:39.165Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-30', '18079559626', 'project_1768400766393', '2026-03-30', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:38.319Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-29', '18079559626', 'project_1768400766393', '2026-03-29', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:37.506Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-28', '18079559626', 'project_1768400766393', '2026-03-28', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T15:34:45.830Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-27', '18079559626', 'project_1768400766393', '2026-03-27', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:35.235Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-26', '18079559626', 'project_1768400766393', '2026-03-26', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:34.047Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-25', '18079559626', 'project_1768400766393', '2026-03-25', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:32.265Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-24', '18079559626', 'project_1768400766393', '2026-03-24', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:30.851Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-23', '18079559626', 'project_1768400766393', '2026-03-23', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:29.615Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-22', '18079559626', 'project_1768400766393', '2026-03-22', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:28.395Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-21', '18079559626', 'project_1768400766393', '2026-03-21', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:27.095Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-20', '18079559626', 'project_1768400766393', '2026-03-20', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:25.672Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-19', '18079559626', 'project_1768400766393', '2026-03-19', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:23.997Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-18', '18079559626', 'project_1768400766393', '2026-03-18', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:22.943Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-17', '18079559626', 'project_1768400766393', '2026-03-17', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:21.980Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-16', '18079559626', 'project_1768400766393', '2026-03-16', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:21.031Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-15', '18079559626', 'project_1768400766393', '2026-03-15', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:20.088Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-14', '18079559626', 'project_1768400766393', '2026-03-14', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:43', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:18.567Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-13', '18079559626', 'project_1768400766393', '2026-03-13', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:17.319Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-12', '18079559626', 'project_1768400766393', '2026-03-12', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:16.153Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-11', '18079559626', 'project_1768400766393', '2026-03-11', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:15.040Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-10', '18079559626', 'project_1768400766393', '2026-03-10', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:13.958Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-09', '18079559626', 'project_1768400766393', '2026-03-09', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:12.875Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-08', '18079559626', 'project_1768400766393', '2026-03-08', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:11.883Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-07', '18079559626', 'project_1768400766393', '2026-03-07', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:10.596Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-06', '18079559626', 'project_1768400766393', '2026-03-06', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:08.977Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-05', '18079559626', 'project_1768400766393', '2026-03-05', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', NULL, '0', 'weekday', '2026-03-03T11:11:07.247Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-24', '18079559626', 'project_1768400766393', '2026-02-24', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '休息', '0', 'weekday', '2026-02-28T11:21:39.839Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-23', '18079559626', 'project_1768400766393', '2026-02-23', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '休息', '0', 'weekday', '2026-02-28T11:21:34.433Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-22', '18079559626', 'project_1768400766393', '2026-02-22', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:42.584Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-21', '18079559626', 'project_1768400766393', '2026-02-21', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:42.584Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-20', '18079559626', 'project_1768400766393', '2026-02-20', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:42.584Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-19', '18079559626', 'project_1768400766393', '2026-02-19', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:42.583Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-18', '18079559626', 'project_1768400766393', '2026-02-18', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:42.583Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-17', '18079559626', 'project_1768400766393', '2026-02-17', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '放假', '0', 'weekday', '2026-02-27T06:56:41.969Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-16', '18079559626', 'project_1768400766393', '2026-02-16', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '休息', '0', 'weekday', '2026-02-28T11:20:01.669Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-15', '18079559626', 'project_1768400766393', '2026-02-15', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'absent', '休息', '0', 'weekday', '2026-02-28T11:19:57.450Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-06', '18079559626', 'project_1768400766393', '2026-02-06', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', '8楼装面板及清理垃圾，办理退场，工作帽和衣都放在仓库', '0', 'weekday', '2026-02-27T15:04:13.588Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-05', '18079559626', 'project_1768400766393', '2026-02-05', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', '8楼装面板', '0', 'weekday', '2026-02-27T15:04:13.463Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-04', '18079559626', 'project_1768400766393', '2026-02-04', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', '7楼装面板', '0', 'weekday', '2026-02-27T15:04:13.337Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-03', '18079559626', 'project_1768400766393', '2026-02-03', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'half', '7楼装面板', '0', 'weekday', '2026-02-27T19:38:58.140Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-02', '18079559626', 'project_1768400766393', '2026-02-02', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', '4楼装面板', '0', 'weekday', '2026-02-27T15:04:13.088Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-02-01', '18079559626', 'project_1768400766393', '2026-02-01', NULL, NULL, '0', '0', '0', NULL, '2026-03-03 19:37:44', 'present', '3楼装面板', '0', 'weekday', '2026-02-27T15:04:12.963Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-01', '13320057022', 'project_1768400766393', '2026-03-01', NULL, NULL, '0', '0', '0', NULL, '2026-03-04 04:58:49', 'present', NULL, '0', 'weekday', '2026-03-04T04:58:49.089Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-02', '13320057022', 'project_1768400766393', '2026-03-02', NULL, NULL, '0', '0', '0', NULL, '2026-03-04 04:58:50', 'present', NULL, '0', 'weekday', '2026-03-04T04:58:50.478Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-03', '13320057022', 'project_1768400766393', '2026-03-03', NULL, NULL, '0', '0', '0', NULL, '2026-03-04 04:58:51', 'present', NULL, '0', 'weekday', '2026-03-04T04:58:51.682Z', NULL, NULL);
INSERT INTO `attendance` (`id`, `user_id`, `projectId`, `date`, `clockIn`, `clockOut`, `workHours`, `restHours`, `overtimeHours`, `note`, `created_at`, `status`, `remark`, `overtime`, `overtimeType`, `updatedAt`, `checkIn`, `checkOut`) VALUES ('attendance_project_1768400766393_2026-03-04', '13320057022', 'project_1768400766393', '2026-03-04', NULL, NULL, '0', '0', '0', NULL, '2026-03-04 04:58:52', 'present', NULL, '0', 'weekday', '2026-03-04T04:58:52.840Z', NULL, NULL);


-- Table structure for table `contacts`
DROP TABLE IF EXISTS `contacts`;
CREATE TABLE contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            name TEXT NOT NULL,
            phone TEXT,
            position TEXT,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, job TEXT, updatedAt INTEGER, createdAt INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `contacts`
INSERT INTO `contacts` (`id`, `user_id`, `projectId`, `name`, `phone`, `position`, `note`, `created_at`, `job`, `updatedAt`, `createdAt`) VALUES ('1768450961918', '18079559626', 'project_1768400766393', '谢毛生', '18720517937', NULL, '主要运材料清垃圾', '2026-03-03 19:37:44', '小工', '1770378353765', NULL);
INSERT INTO `contacts` (`id`, `user_id`, `projectId`, `name`, `phone`, `position`, `note`, `created_at`, `job`, `updatedAt`, `createdAt`) VALUES ('contact_1770379594982', '18079559626', 'project_1768400766393', '唐遥', '18370571729', NULL, '', '2026-03-03 19:37:44', '大工', '2026-03-01T18:23:05.739Z', '1770379594982');
INSERT INTO `contacts` (`id`, `user_id`, `projectId`, `name`, `phone`, `position`, `note`, `created_at`, `job`, `updatedAt`, `createdAt`) VALUES ('manager_project_1768400766393', '18079559626', 'project_1768400766393', '陈后伟 ', '18257875571', NULL, '项目项目经理', '2026-03-03 19:37:44', NULL, NULL, '2026-03-03T14:16:41.426Z');
INSERT INTO `contacts` (`id`, `user_id`, `projectId`, `name`, `phone`, `position`, `note`, `created_at`, `job`, `updatedAt`, `createdAt`) VALUES ('mm82zobjg1q2ui606zj', '18079559626', 'project_1768400766393', '刘辉', '15879886374', NULL, '江宜科技老板娘', '2026-03-03 19:37:44', NULL, '2026-03-01T18:28:24.169Z', '2026-03-01T18:26:14.623Z');
INSERT INTO `contacts` (`id`, `user_id`, `projectId`, `name`, `phone`, `position`, `note`, `created_at`, `job`, `updatedAt`, `createdAt`) VALUES ('mm82y4vkl7bq1o93phr', '18079559626', 'project_1768400766393', '孙玉荣', '15909446349', NULL, '江宜科技老板', '2026-03-03 19:37:44', NULL, NULL, '2026-03-01T18:25:02.769Z');


-- Table structure for table `personalInfo`
DROP TABLE IF EXISTS `personalInfo`;
CREATE TABLE personalInfo (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT,
            job TEXT,
            employeeType TEXT DEFAULT 'fullTime',
            restSystem TEXT DEFAULT 'doubleRest',
            wage REAL DEFAULT 0,
            monthlyWage REAL DEFAULT 0,
            wageCalculationMethod TEXT DEFAULT 'natural',
            overtimeRate REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, subsidySettings TEXT, email TEXT, idNumber TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `personalInfo`
INSERT INTO `personalInfo` (`id`, `user_id`, `name`, `job`, `employeeType`, `restSystem`, `wage`, `monthlyWage`, `wageCalculationMethod`, `overtimeRate`, `created_at`, `subsidySettings`, `email`, `idNumber`) VALUES ('current', '18079559626', '任日飞', '智能化', 'fullTime', 'singleRest', '193.54838709677', '6000', 'currentMonth', '0', '2026-02-24 13:24:49', '{"subsidyType":"monthly","monthlySubsidy":900,"dailySubsidy":0,"perMealSubsidy":0,"mealsPerDay":2,"subsidyStatuses":["present","half","holiday","rest"]}', '806454398@qq.com', '362202198602155776');
INSERT INTO `personalInfo` (`id`, `user_id`, `name`, `job`, `employeeType`, `restSystem`, `wage`, `monthlyWage`, `wageCalculationMethod`, `overtimeRate`, `created_at`, `subsidySettings`, `email`, `idNumber`) VALUES ('personalInfo_project_1770286587197', '18079559626', '任日飞', '智能化', 'fullTime', 'singleRest', '193.54838709677', '6000', 'currentMonth', '0', '2026-02-26 05:57:26', '{"subsidyType":"monthly","monthlySubsidy":900,"dailySubsidy":0,"perMealSubsidy":0,"mealsPerDay":2,"subsidyStatuses":["present","half","holiday","rest"]}', '806454398@qq.com', '362202198602155776');
INSERT INTO `personalInfo` (`id`, `user_id`, `name`, `job`, `employeeType`, `restSystem`, `wage`, `monthlyWage`, `wageCalculationMethod`, `overtimeRate`, `created_at`, `subsidySettings`, `email`, `idNumber`) VALUES ('personal_19198021729', '19198021729', '19198021729', NULL, 'fullTime', 'doubleRest', '0', '0', 'natural', '0', '2026-03-02 05:08:05', NULL, NULL, NULL);
INSERT INTO `personalInfo` (`id`, `user_id`, `name`, `job`, `employeeType`, `restSystem`, `wage`, `monthlyWage`, `wageCalculationMethod`, `overtimeRate`, `created_at`, `subsidySettings`, `email`, `idNumber`) VALUES ('18079559626', '18079559626', '任日飞', '智能化', 'fullTime', 'singleRest', '193.54838709677', '6000', 'currentMonth', '0', '2026-03-03 12:40:08', '{"subsidyType":"monthly","monthlySubsidy":900,"dailySubsidy":0,"perMealSubsidy":0,"mealsPerDay":2,"subsidyStatuses":["present","half","holiday","rest"]}', NULL, NULL);
INSERT INTO `personalInfo` (`id`, `user_id`, `name`, `job`, `employeeType`, `restSystem`, `wage`, `monthlyWage`, `wageCalculationMethod`, `overtimeRate`, `created_at`, `subsidySettings`, `email`, `idNumber`) VALUES ('personalInfo_project_1768400766393', '13320057022', '朱继凤', '小工', 'partTime', 'freeRest', '200', '0', 'currentMonth', '0', '2026-03-04 04:58:41', NULL, NULL, NULL);


-- Table structure for table `wageHistory`
DROP TABLE IF EXISTS `wageHistory`;
CREATE TABLE wageHistory (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            year INTEGER,
            month INTEGER,
            days INTEGER DEFAULT 0,
            hours REAL DEFAULT 0,
            wage REAL DEFAULT 0,
            overtimeWage REAL DEFAULT 0,
            totalWage REAL DEFAULT 0,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, workDays INTEGER, overtime REAL DEFAULT 0, createdAt TEXT, updatedAt TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `wageHistory`
INSERT INTO `wageHistory` (`id`, `user_id`, `year`, `month`, `days`, `hours`, `wage`, `overtimeWage`, `totalWage`, `note`, `created_at`, `workDays`, `overtime`, `createdAt`, `updatedAt`) VALUES ('wage_2026-01', '18079559626', '2026', '1月', '0', '0', '0', '0', '6000', NULL, '2026-03-03 14:11:56', '26', '0', '2026-03-03T13:11:29.026Z', '2026-03-03T13:48:12.904Z');
INSERT INTO `wageHistory` (`id`, `user_id`, `year`, `month`, `days`, `hours`, `wage`, `overtimeWage`, `totalWage`, `note`, `created_at`, `workDays`, `overtime`, `createdAt`, `updatedAt`) VALUES ('wage_2026-02', '18079559626', '2026', '2月', '0', '0', '0', '0', '3321', NULL, '2026-03-03 15:51:50', '5.5', '0', '2026-03-03T15:51:39.812Z', '2026-03-03T15:51:50.859Z');
INSERT INTO `wageHistory` (`id`, `user_id`, `year`, `month`, `days`, `hours`, `wage`, `overtimeWage`, `totalWage`, `note`, `created_at`, `workDays`, `overtime`, `createdAt`, `updatedAt`) VALUES ('wage_2026-03', '13320057022', '2026', '3月', '0', '0', '0', '0', '800', NULL, '2026-03-04 05:01:16', '4', '0', '2026-03-04T04:58:50.120Z', '2026-03-04T05:01:16.378Z');


-- Table structure for table `holidays`
DROP TABLE IF EXISTS `holidays`;
CREATE TABLE holidays (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            projectId TEXT,
            date TEXT NOT NULL,
            name TEXT,
            type TEXT DEFAULT 'holiday',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, description TEXT, category TEXT DEFAULT 'other',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `holidays`
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12867c3', '18079559626', NULL, '2026-04-05', '清明节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1285cb5', '18079559626', NULL, '2026-04-04', '清明节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('holiday_69a60ad4e6753', '18079559626', NULL, '2026-03-03', '元宵节', 'holiday', '2026-03-03 19:37:44', '', 'traditional');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1284cd3', '18079559626', NULL, '2026-02-23', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12837f2', '18079559626', NULL, '2026-02-22', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1282c84', '18079559626', NULL, '2026-02-21', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12820f4', '18079559626', NULL, '2026-02-20', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1298de6', '18079559626', NULL, '2026-10-07', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12979dc', '18079559626', NULL, '2026-10-06', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1296f33', '18079559626', NULL, '2026-10-05', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1296362', '18079559626', NULL, '2026-10-04', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1294def', '18079559626', NULL, '2026-10-03', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1292de7', '18079559626', NULL, '2026-10-02', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12923c1', '18079559626', NULL, '2026-10-01', '国庆节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12913c7', '18079559626', NULL, '2026-09-28', '中秋节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128ff69', '18079559626', NULL, '2026-09-27', '中秋节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128f52f', '18079559626', NULL, '2026-09-26', '中秋节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128e8fa', '18079559626', NULL, '2026-06-22', '端午节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128d6f3', '18079559626', NULL, '2026-06-21', '端午节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128c8c5', '18079559626', NULL, '2026-06-20', '端午节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128b6ae', '18079559626', NULL, '2026-05-05', '劳动节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128103b', '18079559626', NULL, '2026-02-19', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff127f20a', '18079559626', NULL, '2026-02-18', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff127e666', '18079559626', NULL, '2026-02-17', '春节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff127db1d', '18079559626', NULL, '2026-01-03', '元旦', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff127ceb4', '18079559626', NULL, '2026-01-02', '元旦', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a608b6b4f2a', '18079559626', NULL, '2026-01-01', '元旦', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128acd9', '18079559626', NULL, '2026-05-04', '劳动节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff128a182', '18079559626', NULL, '2026-05-03', '劳动节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1289603', '18079559626', NULL, '2026-05-02', '劳动节', 'holiday', '2026-03-03 19:37:44', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff1287e9d', '18079559626', NULL, '2026-05-01', '劳动节', 'holiday', '2026-03-03 19:37:45', NULL, 'other');
INSERT INTO `holidays` (`id`, `user_id`, `projectId`, `date`, `name`, `type`, `created_at`, `description`, `category`) VALUES ('sys_holiday_69a5ff12872a7', '18079559626', NULL, '2026-04-06', '清明节', 'holiday', '2026-03-03 19:37:45', NULL, 'other');


-- Table structure for table `userSettings`
DROP TABLE IF EXISTS `userSettings`;
CREATE TABLE userSettings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

-- Dumping data for table `userSettings`
INSERT INTO `userSettings` (`id`, `user_id`, `key`, `value`, `created_at`) VALUES ('currentProjectId', '18079559626', 'currentProjectId', 'project_1768400766393', '2026-03-03 19:37:45');
INSERT INTO `userSettings` (`id`, `user_id`, `key`, `value`, `created_at`) VALUES ('holidayThemePreference', '18079559626', 'holidayThemePreference', 'auto', '2026-03-03 19:42:55');


-- Table structure for table `user_projects`
DROP TABLE IF EXISTS `user_projects`;
CREATE TABLE user_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (project_id) REFERENCES projects(id),
            UNIQUE(user_id, project_id)
        );

-- Dumping data for table `user_projects`
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('2', '18079559626', 'project_1768400766393', '2026-02-26 11:34:05');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('5', '18079559626', 'project_1770286587197', '2026-02-26 12:33:29');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('6', '18079559626', 'project_1770362921845', '2026-02-26 13:27:04');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('7', '18079559626', 'project_1770368857589', '2026-02-26 13:27:11');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('8', '18079559626', 'project_1770368709785', '2026-02-26 13:27:15');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('9', '18079559626', 'project_1770368596169', '2026-02-26 13:27:20');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('10', '18079559626', 'project_1770368744553', '2026-02-26 13:27:25');
INSERT INTO `user_projects` (`id`, `user_id`, `project_id`, `created_at`) VALUES ('13', '13320057022', 'project_1768400766393', '2026-02-28 08:48:12');


-- Table structure for table `feedback`
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            contact TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        , reply TEXT, reply_at TIMESTAMP, is_notified INTEGER DEFAULT 0);


-- Table structure for table `app_version`
DROP TABLE IF EXISTS `app_version`;
CREATE TABLE app_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL DEFAULT '1.0.0',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- Dumping data for table `app_version`
INSERT INTO `app_version` (`id`, `version`, `updated_at`) VALUES ('1', '1.0.1', '2026-03-01 14:05:02');


-- Table structure for table `settings`
DROP TABLE IF EXISTS `settings`;
CREATE TABLE settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

-- Dumping data for table `settings`
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('1', 'systemName', '任工记工', '2026-03-02 08:55:36', '2026-03-02 09:54:19');
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('2', 'allowRememberPassword', '', '2026-03-02 08:55:36', '2026-03-02 09:54:19');
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('3', 'workStartTime', '09:00', '2026-03-02 08:55:36', '2026-03-02 09:54:19');
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('4', 'workEndTime', '18:00', '2026-03-02 08:55:36', '2026-03-02 09:54:19');
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('5', 'lateThreshold', '10', '2026-03-02 08:55:36', '2026-03-02 09:54:19');
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES ('6', 'enableNotifications', '1', '2026-03-02 08:55:36', '2026-03-02 09:54:19');


-- Table structure for table `admins`
DROP TABLE IF EXISTS `admins`;
CREATE TABLE admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

-- Dumping data for table `admins`
INSERT INTO `admins` (`id`, `username`, `password`, `created_at`) VALUES ('1', 'admin', '$2y$10$UKopiHkFWK0o45pTNOpe6.bSMTr/9DI3o7XDWy7eZpUs5VrryIuUO', '2026-03-02 22:57:01');


-- Table structure for table `system_settings`
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        settings TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- Dumping data for table `system_settings`
INSERT INTO `system_settings` (`id`, `settings`, `created_at`, `updated_at`) VALUES ('1', '{"systemName":"\u8003\u52e4\u7ba1\u7406\u7cfb\u7edf","allowRememberPassword":true,"lateThreshold":10,"autoBackupEnabled":true,"backupFrequency":"weekly","backupTime":"02:00","backupRetention":2}', '2026-03-04 06:27:22', '2026-03-04 06:27:22');

