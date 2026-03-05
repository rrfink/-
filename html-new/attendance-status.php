<?php
$pageTitle = '考勤状态 - 任工记工';
$isHome = false;
$page = 'attendance';
include 'header.php';
?>
    <link rel="stylesheet" href="/jg/css-new/attendance.css">
    <main class="app-main">
        <div class="container">
            <div class="section">
                <div class="section-header">
                    <?php
                    // 解析URL参数
                    $adminView = isset($_GET['admin_view']) && $_GET['admin_view'] == '1';
                    $returnUrl = isset($_GET['return_url']) ? $_GET['return_url'] : '';
                    if ($adminView && $returnUrl) {
                        echo '<div class="admin-return-link" style="margin-bottom: 16px;">
                            <a href="' . htmlspecialchars($returnUrl) . '" class="btn btn-secondary">
                                <i class="fas fa-arrow-left"></i> 返回管理员后台
                            </a>
                        </div>';
                    }
                    ?>
                    <h2 class="section-title">考勤状态</h2>
                    <div class="section-actions">
                        <button class="btn btn-primary btn-sm" id="export-attendance">
                            <i class="fas fa-download"></i>
                            导出
                        </button>
                        <button class="btn btn-warning btn-sm" id="check-attendance-anomalies" data-action="check-attendance-anomalies">
                            <i class="fas fa-exclamation-triangle"></i>
                            检查异常
                        </button>
                    </div>
                </div>

                <!-- 考勤异常提醒 -->
                <div class="section" id="attendance-alert-section" style="display: none; margin-bottom: 20px;">
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-exclamation-triangle" style="color: #856404; font-size: 20px;"></i>
                                <h3 style="margin: 0; color: #856404; font-size: 18px;">考勤异常提醒</h3>
                            </div>
                            <button id="close-alert" data-action="close-alert" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #856404;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div id="alert-content" style="margin-bottom: 12px; color: #856404;">
                            <!-- 异常内容将动态生成 -->
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="check-anomalies" data-action="check-anomalies" style="padding: 6px 12px; background-color: #856404; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-search"></i> 查看详情
                            </button>
                            <button id="clear-anomalies" data-action="clear-anomalies" style="padding: 6px 12px; background-color: #fff; color: #856404; border: 1px solid #856404; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-check"></i> 标记已处理
                            </button>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">筛选条件</h3>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;">
                            <!-- 状态筛选 -->
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <label style="display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; color: #6c757d;">
                                    <i class="fas fa-filter" style="color: #007bff; font-size: 16px;"></i>
                                    <span>状态</span>
                                </label>
                                <select id="status-filter" style="padding: 10px; font-size: 16px; border-radius: 4px; border: 1px solid #ced4da; width: 250px; box-sizing: border-box;">
                                    <option value="all">全部状态</option>
                                    <option value="present">满勤</option>
                                    <option value="half">半天</option>
                                    <option value="absent">缺勤</option>
                                    <option value="leave">请假</option>
                                    <option value="rest">休息</option>
                                    <option value="holiday">放假</option>
                                </select>
                            </div>
                            
                            <!-- 开始日期 -->
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <label style="display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; color: #6c757d;">
                                    <i class="fas fa-calendar-alt" style="color: #007bff; font-size: 16px;"></i>
                                    <span>开始日期</span>
                                </label>
                                <input type="date" id="date-start" style="padding: 10px; font-size: 16px; border-radius: 4px; border: 1px solid #ced4da; width: 200px; box-sizing: border-box;">
                            </div>
                            
                            <!-- 结束日期 -->
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <label style="display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; color: #6c757d;">
                                    <span>至</span>
                                </label>
                                <input type="date" id="date-end" style="padding: 10px; font-size: 16px; border-radius: 4px; border: 1px solid #ced4da; width: 200px; box-sizing: border-box;">
                            </div>
                            
                            <!-- 应用筛选按钮 -->
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <button id="apply-date-filter" style="padding: 10px 20px; font-size: 16px; border-radius: 4px; border: none; background-color: #007bff; color: white; cursor: pointer; white-space: nowrap; transition: all 0.2s ease-in-out;">
                                    <i class="fas fa-search mr-1"></i>
                                    应用筛选
                                </button>
                            </div>
                            

                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                            <h3 class="section-title">考勤统计</h3>
                            <p class="section-description" id="stat-period">当月考勤统计</p>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">满勤</div>
                                <div class="stat-value" id="stat-present">0</div>
                                <div class="stat-change positive">天</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">半天</div>
                                <div class="stat-value" id="stat-half">0</div>
                                <div class="stat-change positive">天</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">缺勤</div>
                                <div class="stat-value" id="stat-absent">0</div>
                                <div class="stat-change positive">天</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">迟到</div>
                                <div class="stat-value" id="stat-late">0</div>
                                <div class="stat-change positive">次</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">提前到岗</div>
                                <div class="stat-value" id="stat-early">0</div>
                                <div class="stat-change positive">次</div>
                            </div>
                            <div class="stat-card" style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);">
                                <div class="stat-label" style="color: #856404;">异常(未打卡)</div>
                                <div class="stat-value" id="stat-anomaly" style="color: #856404;">0</div>
                                <div class="stat-change" style="color: #856404;">天</div>
                            </div>
                        </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">考勤记录</h3>
                    </div>
                    <div id="attendance-list" class="attendance-list"></div>
                </div>
            </div>
        </div>
    </main>
    <?php
    include 'menu.php';
    include 'footer.php';
    ?>
    <!-- 第三方库 -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    
    <!-- 加载页面初始化脚本 -->
    <script src="/jg/js-pages/attendance-status-init.js?v=1772207380"></script>
</body>
</html>