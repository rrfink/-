class ReimbursementManager {
    constructor() {
        this.reimbursements = [];
        this.userId = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.cache = new Map();
        this.CACHE_DURATION = 60000; // 1分钟缓存
    }

    async init() {
        await this.getUserId();
        await this.loadReimbursements();
        this.render();
        this.bindEvents();
    }

    async getUserId() {
        this.userId = localStorage.getItem('user_id');
        if (!this.userId) {
            const urlParams = new URLSearchParams(window.location.search);
            this.userId = urlParams.get('user_id');
        }
    }

    async loadReimbursements(page = 1) {
        try {
            // 显示加载状态
            this.showLoading();
            
            // 检查缓存
            const cacheKey = `reimbursements_${this.userId}_${page}_${this.pageSize}`;
            const cachedData = this.cache.get(cacheKey);
            const now = Date.now();
            
            if (cachedData && (now - cachedData.timestamp) < this.CACHE_DURATION) {
                console.log('使用缓存的报销数据');
                this.reimbursements = cachedData.data.data || [];
                this.currentPage = cachedData.data.page || 1;
                this.totalPages = cachedData.data.total_pages || 1;
                this.totalRecords = cachedData.data.total || 0;
                this.updateStats();
                this.hideLoading();
                return;
            }

            const response = await fetch(`/jg/api/reimbursement.php?action=get&user_id=${this.userId}&page=${page}&page_size=${this.pageSize}&csrf_token=${window.CSRF_TOKEN}`);
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const text = await response.text();
            
            try {
                const result = JSON.parse(text);
                
                if (result.success) {
                    this.reimbursements = result.data || [];
                    this.currentPage = result.page || 1;
                    this.totalPages = result.total_pages || 1;
                    this.totalRecords = result.total || 0;
                    this.updateStats();
                    
                    // 更新缓存
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: now
                    });
                } else {
                    console.error('加载报销数据失败:', result.message);
                    this.reimbursements = [];
                }
                this.hideLoading();
            } catch (parseError) {
                console.error('JSON解析失败:', parseError);
                console.error('响应内容:', text);
                this.reimbursements = [];
                this.hideLoading();
            }
        } catch (error) {
            console.error('加载报销数据失败:', error);
            this.reimbursements = [];
            this.hideLoading();
        }
    }

    showLoading() {
        const container = document.getElementById('reimbursementList');
        if (container) {
            container.style.position = 'relative';
            container.style.minHeight = '200px';
            container.style.overflow = 'hidden';
            
            const loadingHtml = `
                <div id="reimbursementLoading" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                ">
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 10px;
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border: 3px solid #f3f3f3;
                            border-top: 3px solid #1890ff;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        "></div>
                        <span style="color: var(--text-secondary);">加载中...</span>
                    </div>
                </div>
            `;
            
            // 移除已存在的加载状态
            const existingLoading = document.getElementById('reimbursementLoading');
            if (existingLoading) {
                existingLoading.remove();
            }
            
            container.insertAdjacentHTML('afterbegin', loadingHtml);
        }
    }

    hideLoading() {
        const loading = document.getElementById('reimbursementLoading');
        if (loading) {
            loading.remove();
        }
    }

    async saveReimbursements() {
        this.updateStats();
    }

    updateStats() {
        const total = this.reimbursements.reduce((sum, r) => sum + r.amount, 0);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthTotal = this.reimbursements
            .filter(r => {
                const date = new Date(r.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, r) => sum + r.amount, 0);

        document.getElementById('totalAmount').textContent = `¥${total.toFixed(2)}`;
        document.getElementById('monthAmount').textContent = `¥${monthTotal.toFixed(2)}`;
        document.getElementById('totalCount').textContent = this.reimbursements.length;
    }

    render() {
        const container = document.getElementById('reimbursementList');
        if (!container) return;

        if (this.reimbursements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无报销记录</p>
                </div>
            `;
            return;
        }

        const reimbursementHtml = this.reimbursements.map(r => `
            <div class="reimbursement-item" data-id="${r.id}">
                <div class="reimbursement-info">
                    <div class="reimbursement-date">${r.date}</div>
                    <div class="reimbursement-title">${r.title}</div>
                    ${r.remark ? `<div class="reimbursement-remark">${r.remark}</div>` : ''}
                    ${r.image ? `<div class="reimbursement-image" style="position: relative; display: inline-block; margin-top: 8px;">
                        <div class="image-loading" style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 80px;
                            height: 80px;
                            background: #f0f0f0;
                            border-radius: 4px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-spinner fa-spin" style="color: #1890ff;"></i>
                        </div>
                        <img 
                            data-lazy="${r.image}" 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" 
                            onclick="reimbursementManager.viewImage('${r.image}')" 
                            style="
                                max-width: 80px; 
                                max-height: 80px; 
                                border-radius: 4px; 
                                cursor: pointer; 
                                opacity: 0; 
                                transition: opacity 0.3s ease;
                            "
                            onload="this.style.opacity='1'; this.previousElementSibling.style.display='none';"
                            onerror="this.style.opacity='1'; this.previousElementSibling.style.display='none'; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%221%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22 ry=%222%22%3E%3C/rect%3E%3Ccircle cx=%228.5%22 cy=%228.5%22 r=%221.5%22%3E%3C/circle%3E%3Cpolyline points=%2221 15 16 10 5 21%22%3E%3C/polyline%3E%3C/svg%3E';"
                        />
                    </div>` : ''}
                </div>
                <div class="reimbursement-amount">¥${r.amount.toFixed(2)}</div>
                <div class="reimbursement-actions">
                    <button class="btn btn-sm btn-outline" onclick="reimbursementManager.editReimbursement(${r.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="reimbursementManager.deleteReimbursement(${r.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const paginationHtml = this.renderPagination();

        container.innerHTML = reimbursementHtml + paginationHtml;
        
        // 刷新懒加载，观察新添加的图片
        if (window.lazyLoadInstance) {
            window.lazyLoadInstance.refresh();
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('报销数据缓存已清除');
    }

    renderPagination() {
        if (this.totalPages <= 1) return '';

        let pagination = `
            <div class="pagination" style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 10px;">
                <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="reimbursementManager.loadReimbursements(${this.currentPage - 1})" class="btn btn-sm btn-outline" style="${this.currentPage === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    <i class="fas fa-chevron-left"></i>
                </button>
        `;

        for (let i = 1; i <= this.totalPages; i++) {
            pagination += `
                <button onclick="reimbursementManager.loadReimbursements(${i})" class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-outline'}" style="${i === this.currentPage ? 'background-color: #1890ff; color: white; border: none;' : ''}">
                    ${i}
                </button>
            `;
        }

        pagination += `
                <button ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="reimbursementManager.loadReimbursements(${this.currentPage + 1})" class="btn btn-sm btn-outline" style="${this.currentPage === this.totalPages ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <span style="margin-left: 10px; font-size: 14px; color: var(--text-secondary);">
                    共 ${this.totalRecords} 条记录
                </span>
            </div>
        `;

        return pagination;
    }

    bindEvents() {
        const addBtn = document.getElementById('addReimbursementBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddDialog());
        }

        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCsv());
        }

        const exportHtmlBtn = document.getElementById('exportHtmlBtn');
        if (exportHtmlBtn) {
            exportHtmlBtn.addEventListener('click', () => this.exportHtml());
        }
    }

    exportCsv() {
        if (this.reimbursements.length === 0) {
            window.toast.warning('暂无数据可导出');
            return;
        }

        const pathParts = window.location.pathname.split('/');
        const jgIndex = pathParts.indexOf('jg');
        let basePath = '';
        if (jgIndex !== -1) {
            basePath = pathParts.slice(0, jgIndex).join('/');
        }
        const baseUrl = window.location.origin + basePath;

        const headers = ['报销日期', '报销标题', '报销金额', '备注', '创建时间', '图片链接'];
        const rows = this.reimbursements.map(r => [
            r.date,
            r.title,
            r.amount.toFixed(2),
            r.remark || '',
            r.created_at,
            r.image ? baseUrl + r.image : ''
        ]);

        let csvContent = '\uFEFF';
        csvContent += headers.join(',') + '\n';
        
        rows.forEach(row => {
            csvContent += row.map(cell => {
                if (cell.includes(',') || cell.includes('\n')) {
                    return '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `报销记录_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        window.toast.success('CSV导出成功');
    }

    exportHtml() {
        if (this.reimbursements.length === 0) {
            window.toast.warning('暂无数据可导出');
            return;
        }

        const pathParts = window.location.pathname.split('/');
        const jgIndex = pathParts.indexOf('jg');
        let basePath = '';
        if (jgIndex !== -1) {
            basePath = pathParts.slice(0, jgIndex).join('/');
        }
        const baseUrl = window.location.origin + basePath;

        let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>报销记录</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            padding: 30px;
            background-color: #f5f7fa;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        
        h1 {
            text-align: center;
            color: #1890ff;
            margin-bottom: 30px;
            font-size: 24px;
        }
        
        .summary {
            background-color: #f0f5ff;
            border: 1px solid #d6e4ff;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .summary-item {
            text-align: center;
        }
        
        .summary-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #1890ff;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        th {
            background-color: #1890ff;
            color: white;
            font-weight: bold;
            padding: 12px 15px;
            text-align: left;
            border: 1px solid #e8e8e8;
        }
        
        td {
            padding: 12px 15px;
            border: 1px solid #e8e8e8;
            vertical-align: top;
        }
        
        tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        tr:hover {
            background-color: #f0f5ff;
        }
        
        .amount {
            text-align: right;
            font-weight: bold;
            color: #ff4d4f;
        }
        
        .image-cell img {
            max-width: 100px;
            max-height: 100px;
            cursor: pointer;
            border-radius: 4px;
            transition: transform 0.2s ease;
        }
        
        .image-cell img:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .no-image {
            color: #999;
            font-style: italic;
        }
        
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e8e8e8;
            color: #666;
            font-size: 14px;
        }
        
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>报销记录 - ${new Date().toLocaleDateString('zh-CN')}</h1>
        
        <div class="summary">
            <div class="summary-item">
                <div class="summary-label">总报销金额</div>
                <div class="summary-value">¥${this.reimbursements.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">报销记录数</div>
                <div class="summary-value">${this.reimbursements.length} 条</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">导出日期</div>
                <div class="summary-value">${new Date().toLocaleString('zh-CN')}</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>报销日期</th>
                    <th>报销标题</th>
                    <th>报销金额</th>
                    <th>备注</th>
                    <th>图片</th>
                    <th>创建时间</th>
                </tr>
            </thead>
            <tbody>`;

        this.reimbursements.forEach(r => {
            const imageUrl = r.image ? baseUrl + r.image : '';
            htmlContent += `
            <tr>
                <td>${r.date}</td>
                <td>${r.title}</td>
                <td class="amount">¥${r.amount.toFixed(2)}</td>
                <td>${r.remark || '<span class="no-image">无</span>'}</td>
                <td class="image-cell">
                    ${imageUrl 
                        ? `<img src="${imageUrl}" onclick="window.open('${imageUrl}')" title="点击查看大图">` 
                        : '<span class="no-image">无</span>'}
                </td>
                <td>${r.created_at}</td>
            </tr>`;
        });

        htmlContent += `
        </tbody>
    </table>
    
    <div class="footer">
        <p>本数据来源于任工记工系统自动生成，</p>
        <p style="margin-top: 10px;"><a href="http://rrf.ink" target="_blank" style="color: #1890ff; text-decoration: none;">进入任工记工系统</a></p>
    </div>
</div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `报销记录_${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(url);

        window.toast.success('HTML导出成功');
    }

    showAddDialog() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        window.dialog.show({
            title: '添加报销',
            htmlContent: `
                <div class="form-group">
                    <label>报销标题</label>
                    <input type="text" id="reimbursementTitle" placeholder="请输入报销标题">
                </div>
                <div class="form-group">
                    <label>报销金额</label>
                    <input type="number" id="reimbursementAmount" placeholder="请输入金额" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>报销日期</label>
                    <input type="date" id="reimbursementDate" value="${year}-${month}-${day}">
                </div>
                <div class="form-group">
                    <label>报销凭证（最大2MB）</label>
                    <input type="file" id="reimbursementImage" accept="image/*" onchange="reimbursementManager.handleImageUpload(this)">
                    <div id="imagePreview" style="margin-top: 10px; display: none;">
                        <img id="previewImg" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                        <button type="button" onclick="reimbursementManager.removeImage()" style="margin-left: 10px; padding: 4px 8px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="reimbursementRemark" placeholder="请输入备注（可选）" rows="3"></textarea>
                </div>
            `,
            confirmText: '保存',
            onConfirm: async () => {
                const title = document.getElementById('reimbursementTitle').value.trim();
                const amount = parseFloat(document.getElementById('reimbursementAmount').value);
                const date = document.getElementById('reimbursementDate').value;
                const remark = document.getElementById('reimbursementRemark').value.trim();
                const imageFile = document.getElementById('reimbursementImage').files[0];

                if (!title) {
                    throw new Error('请输入报销标题');
                }

                if (!amount || amount <= 0) {
                    throw new Error('请输入有效的报销金额');
                }

                if (!date) {
                    throw new Error('请选择报销日期');
                }

                const formData = new FormData();
                formData.append('user_id', this.userId);
                formData.append('title', title);
                formData.append('amount', amount);
                formData.append('date', date);
                formData.append('remark', remark);
                if (imageFile) {
                    formData.append('image', imageFile);
                }
                
                // 添加CSRF令牌到formData（确保token存在）
                if (!window.CSRF_TOKEN) {
                    console.error('CSRF_TOKEN未定义');
                    throw new Error('页面状态异常，请刷新页面后重试');
                }
                formData.append('csrf_token', window.CSRF_TOKEN);
                
                const response = await fetch('/jg/api/reimbursement.php?action=add', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                
                const text = await response.text();
                
                try {
                    const result = JSON.parse(text);

                    if (result.success) {
                        // 清除缓存
                        this.clearCache();
                        await this.loadReimbursements(this.currentPage);
                        this.render();
                        window.toast.success('报销添加成功');
                    } else {
                        throw new Error(result.message || '添加失败');
                    }
                } catch (parseError) {
                    console.error('JSON解析失败:', parseError);
                    console.error('响应内容:', text);
                    throw new Error('服务器响应格式错误');
                }
            }
        });
    }

    handleImageUpload(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            
            // 检查文件大小
            if (file.size > 2 * 1024 * 1024) {
                window.toast.error('图片大小不能超过2MB');
                input.value = '';
                return;
            }
            
            // 压缩图片
            this.compressImage(file, (compressedDataUrl) => {
                window.currentUploadedImage = compressedDataUrl;
                const previewImg = document.getElementById('previewImg');
                const imagePreview = document.getElementById('imagePreview');
                
                if (previewImg) {
                    previewImg.src = compressedDataUrl;
                }
                if (imagePreview) {
                    imagePreview.style.display = 'block';
                }
                
                window.toast.success('图片上传成功');
            });
        }
    }

    compressImage(file, callback) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // 计算压缩后的尺寸
            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为 base64 字符串，质量为 0.8
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    }

    removeImage() {
        window.currentUploadedImage = null;
        window.deleteImageFlag = true;
        const imagePreview = document.getElementById('imagePreview');
        const fileInput = document.getElementById('reimbursementImage');
        
        if (imagePreview) {
            imagePreview.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }
    }

    viewImage(imageSrc) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: grab;
            overflow: hidden;
        `;

        const img = document.createElement('img');
        img.src = imageSrc;
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX, startY;
        
        const updateTransform = () => {
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            transform-origin: center center;
            cursor: grab;
            user-select: none;
            transition: transform 0.1s ease;
        `;

        overlay.appendChild(img);
        document.body.appendChild(overlay);

        overlay.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(0.5, Math.min(5, scale + delta));
            
            if (newScale !== scale) {
                scale = newScale;
                img.style.transition = 'none';
                updateTransform();
                setTimeout(() => {
                    img.style.transition = 'transform 0.1s ease';
                }, 10);
            }
        });

        img.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            img.style.cursor = 'grabbing';
            img.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'grab';
                img.style.transition = 'transform 0.1s ease';
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
            }
        });

        const hint = document.createElement('div');
        hint.textContent = '滚轮缩放 | 拖动查看 | 点击背景关闭 | ESC关闭';
        hint.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10001;
        `;
        overlay.appendChild(hint);
    }

    editReimbursement(id) {
        const reimbursement = this.reimbursements.find(r => r.id === id);
        if (!reimbursement) return;

        window.currentUploadedImage = reimbursement.image || null;
        window.deleteImageFlag = false;

        const imagePreviewHtml = reimbursement.image 
            ? `<div id="imagePreview" style="margin-top: 10px;">
                   <img id="previewImg" src="${reimbursement.image}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                   <button type="button" onclick="reimbursementManager.removeImage()" style="margin-left: 10px; padding: 4px 8px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
               </div>`
            : `<div id="imagePreview" style="margin-top: 10px; display: none;">
                   <img id="previewImg" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                   <button type="button" onclick="reimbursementManager.removeImage()" style="margin-left: 10px; padding: 4px 8px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
               </div>`;

        window.dialog.show({
            title: '编辑报销',
            htmlContent: `
                <div class="form-group">
                    <label>报销标题</label>
                    <input type="text" id="reimbursementTitle" value="${reimbursement.title}">
                </div>
                <div class="form-group">
                    <label>报销金额</label>
                    <input type="number" id="reimbursementAmount" value="${reimbursement.amount}" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>报销日期</label>
                    <input type="date" id="reimbursementDate" value="${reimbursement.date}">
                </div>
                <div class="form-group">
                    <label>报销凭证（最大2MB）</label>
                    <input type="file" id="reimbursementImage" accept="image/*" onchange="reimbursementManager.handleImageUpload(this)">
                    ${imagePreviewHtml}
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea id="reimbursementRemark" rows="3">${reimbursement.remark || ''}</textarea>
                </div>
            `,
            confirmText: '更新',
            onConfirm: async () => {
                const title = document.getElementById('reimbursementTitle').value.trim();
                const amount = parseFloat(document.getElementById('reimbursementAmount').value);
                const date = document.getElementById('reimbursementDate').value;
                const remark = document.getElementById('reimbursementRemark').value.trim();
                const imageFile = document.getElementById('reimbursementImage').files[0];

                if (!title) {
                    throw new Error('请输入报销标题');
                }

                if (!amount || amount <= 0) {
                    throw new Error('请输入有效的报销金额');
                }

                if (!date) {
                    throw new Error('请选择报销日期');
                }

                const formData = new FormData();
                formData.append('id', id);
                formData.append('user_id', this.userId);
                formData.append('title', title);
                formData.append('amount', amount);
                formData.append('date', date);
                formData.append('remark', remark);
                if (window.deleteImageFlag) {
                    formData.append('delete_image', '1');
                }
                if (imageFile) {
                    formData.append('image', imageFile);
                }

                try {
                    // 添加CSRF令牌到formData
                    formData.append('csrf_token', window.CSRF_TOKEN);
                    const response = await fetch('/jg/api/reimbursement.php?action=update', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('网络请求失败');
                    }
                    
                    const text = await response.text();
                    
                    try {
                        const result = JSON.parse(text);

                        if (result.success) {
                            // 清除缓存
                            this.clearCache();
                            await this.loadReimbursements(this.currentPage);
                            this.render();
                            window.toast.success('报销更新成功');
                        } else {
                            throw new Error(result.message || '更新失败');
                        }
                    } catch (parseError) {
                        console.error('JSON解析失败:', parseError);
                        console.error('响应内容:', text);
                        throw new Error('服务器响应格式错误');
                    }
                } catch (error) {
                    throw error;
                }
            }
        });
    }

    deleteReimbursement(id) {
        window.dialog.show({
            title: '确认删除',
            htmlContent: '<p>确定要删除这条报销记录吗？</p>',
            confirmText: '删除',
            cancelText: '取消',
            onConfirm: async () => {
                const formData = new FormData();
                formData.append('id', id);
                formData.append('user_id', this.userId);

                try {
                    // 添加CSRF令牌到formData
                    formData.append('csrf_token', window.CSRF_TOKEN);
                    const response = await fetch('/jg/api/reimbursement.php?action=delete', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('网络请求失败');
                    }
                    
                    const text = await response.text();
                    
                    try {
                        const result = JSON.parse(text);

                        if (result.success) {
                            // 清除缓存
                            this.clearCache();
                            await this.loadReimbursements(this.currentPage);
                            this.render();
                            window.toast.success('报销删除成功');
                        } else {
                            throw new Error(result.message || '删除失败');
                        }
                    } catch (parseError) {
                        console.error('JSON解析失败:', parseError);
                        console.error('响应内容:', text);
                        throw new Error('服务器响应格式错误');
                    }
                } catch (error) {
                    throw error;
                }
            }
        });
    }
}