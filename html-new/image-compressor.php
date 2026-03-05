<?php
$pageTitle = '图片压缩工具';
$isHome = false;
$page = 'image-compressor';
include 'header.php';
?>

<script src="/jg/js-shared/menu-handler.js?v=2.4"></script>

<main class="app-main">
    <div class="container">
        <div class="section">
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-file-image"></i> 图片压缩工具</h2>
            </div>
            
            <div class="image-compressor-container">
            <div class="upload-section">
                <div class="upload-area" id="uploadArea">
                    <i class="fas fa-cloud-upload-alt upload-icon"></i>
                    <p>点击或拖拽图片到此处上传</p>
                    <input type="file" id="imageInput" accept="image/*" style="display: none;">
                </div>
                
                <div class="compression-options">
                <label for="qualitySlider">压缩质量:</label>
                <input type="range" id="qualitySlider" min="10" max="100" value="70">
                <span id="qualityValue">70%</span>
                <label style="margin-left: 20px;">
                    <select id="compressFormat" style="margin-left: 5px;">
                        <option value="auto">自动选择</option>
                        <option value="jpeg">JPEG (更小)</option>
                        <option value="webp">WebP (更小+透明)</option>
                    </select>
                </label>
                <label style="margin-left: 20px;">
                    <select id="resizeOption" style="margin-left: 5px;">
                        <option value="original">原始尺寸</option>
                        <option value="75">75%尺寸</option>
                        <option value="50">50%尺寸</option>
                        <option value="25">25%尺寸</option>
                    </select>
                </label>
            </div>
            </div>
            
            <div class="preview-section">
                <div class="preview-container">
                    <div class="original-image">
                        <h3>原图</h3>
                        <div class="image-preview" id="originalPreview">
                            <i class="fas fa-image placeholder-icon"></i>
                            <p>原图预览</p>
                        </div>
                        <div class="image-info" id="originalInfo">
                            <p>文件大小: -</p>
                            <p>尺寸: -</p>
                        </div>
                    </div>
                    
                    <div class="compressed-image">
                        <h3>压缩后</h3>
                        <div class="image-preview" id="compressedPreview">
                            <i class="fas fa-image placeholder-icon"></i>
                            <p>压缩后预览</p>
                        </div>
                        <div class="image-info" id="compressedInfo">
                            <p>文件大小: -</p>
                            <p>压缩率: -</p>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button id="compressButton" class="btn btn-primary" disabled>压缩图片</button>
                    <button id="downloadButton" class="btn btn-success" disabled>下载压缩图</button>
                    <button id="resetButton" class="btn btn-secondary">重置</button>
                </div>
            </div>
            </div>
        </div>
    </div>
</main>

<style>
.image-compressor-container {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--box-shadow);
    margin-top: var(--spacing-md);
}

.upload-section {
    margin-bottom: var(--spacing-lg);
}

.upload-area {
    border: 2px dashed var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: var(--bg-light);
}

.upload-area:hover {
    border-color: var(--primary-color);
    background: var(--primary-light);
}

.upload-icon {
    font-size: 48px;
    color: var(--text-light);
    margin-bottom: var(--spacing-md);
}

.compression-options {
    margin-top: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

#qualitySlider {
    flex: 1;
}

.preview-section {
    margin-top: var(--spacing-lg);
}

.preview-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
}

.original-image, .compressed-image {
    text-align: center;
}

.image-preview {
    width: 100%;
    height: 300px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin: var(--spacing-md) 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-light);
    overflow: hidden;
}

.image-preview img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.placeholder-icon {
    font-size: 48px;
    color: var(--text-light);
    margin-bottom: var(--spacing-sm);
}

.image-info {
    text-align: left;
    margin-top: var(--spacing-sm);
    font-size: 14px;
    color: var(--text-secondary);
}

.action-buttons {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    margin-top: var(--spacing-lg);
}

.btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.btn-primary {
    background: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background: var(--primary-dark);
}

.btn-success {
    background: var(--success-color);
    color: white;
}

.btn-success:hover {
    background: var(--success-dark);
}

.btn-secondary {
    background: var(--text-light);
    color: var(--text-primary);
}

.btn-secondary:hover {
    background: var(--text-secondary);
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .preview-container {
        grid-template-columns: 1fr;
    }
    
    .action-buttons {
        flex-direction: column;
        align-items: center;
    }
    
    .btn {
        width: 100%;
        max-width: 200px;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // 初始化主题管理器
    if (window.ThemeManager && window.IntelligentStorageManager && window.EventBus) {
        const storage = new window.IntelligentStorageManager();
        const eventBus = new window.EventBus();
        
        try {
            storage.init();
        } catch (e) {
            console.warn('Storage init failed:', e);
        }
        
        const theme = new window.ThemeManager(storage, eventBus);
        
        // 先暴露到全局，再调用init()，因为bindEvents需要window.themeManager
        window.themeManager = theme;
        console.log('Theme manager set to window');
        
        theme.init();
        console.log('Theme manager initialized');
    } else {
        console.warn('ThemeManager not available');
    }
    
    // 初始化菜单处理器
    if (window.MenuHandler) {
        const toast = window.toast || { error: () => {}, info: () => {} };
        const logger = window.logger || { info: () => {}, error: () => {} };
        
        const menuHandler = new MenuHandler({
            toast: toast,
            logger: logger
        });
        menuHandler.init();
        console.log('Menu handler initialized');
    } else {
        console.warn('MenuHandler not found');
    }
    
    // 登录图标点击事件
    const loginIcon = document.getElementById('loginIcon');
    if (loginIcon) {
        loginIcon.addEventListener('click', () => {
            window.location.href = '/jg/html-new/user-center.php';
        });
    }
});

// 图片压缩功能
let originalImage = null;
let compressedImage = null;
let originalFileSize = 0;
let compressedFileSize = 0;

// 上传区域点击事件
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');

uploadArea.addEventListener('click', () => {
    imageInput.click();
});

// 拖拽事件
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--primary-color)';
    uploadArea.style.background = 'var(--primary-light)';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'var(--border-color)';
    uploadArea.style.background = 'var(--bg-light)';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--border-color)';
    uploadArea.style.background = 'var(--bg-light)';
    
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// 文件选择事件
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// 处理文件
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件！');
        return;
    }
    
    originalFileSize = file.size;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage = e.target.result;
        displayOriginalImage(originalImage);
        updateOriginalInfo(file);
        enableCompressButton();
    };
    reader.readAsDataURL(file);
}

// 显示原图
function displayOriginalImage(imageData) {
    const preview = document.getElementById('originalPreview');
    preview.innerHTML = `<img src="${imageData}" alt="原图">`;
}

// 更新原图信息
function updateOriginalInfo(file) {
    const info = document.getElementById('originalInfo');
    const size = (file.size / 1024).toFixed(2);
    
    // 创建临时图片获取尺寸
    const img = new Image();
    img.onload = () => {
        info.innerHTML = `
            <p>文件大小: ${size} KB</p>
            <p>尺寸: ${img.width} × ${img.height}</p>
        `;
    };
    img.src = URL.createObjectURL(file);
}

// 启用压缩按钮
function enableCompressButton() {
    document.getElementById('compressButton').disabled = false;
}

// 质量滑块事件
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;
});

// 压缩按钮事件
const compressButton = document.getElementById('compressButton');
compressButton.addEventListener('click', compressImage);

// 压缩图片
function compressImage() {
    if (!originalImage) return;
    
    const quality = parseInt(qualitySlider.value) / 100;
    const compressFormat = document.getElementById('compressFormat').value;
    const resizeOption = document.getElementById('resizeOption').value;
    
    const canvas = document.createElement('canvas');
    const img = new Image();
    
    img.onload = () => {
        // 计算调整后的尺寸
        let width = img.width;
        let height = img.height;
        
        if (resizeOption !== 'original') {
            const scale = parseInt(resizeOption) / 100;
            width = Math.round(img.width * scale);
            height = Math.round(img.height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        
        // 绘制图片（调整尺寸）
        ctx.drawImage(img, 0, 0, width, height);
        
        // 检测图片是否包含透明通道
        const hasAlpha = checkImageHasAlpha(img);
        
        // 检查浏览器是否支持WebP
        const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        
        // 根据用户选择的格式进行压缩
        if (compressFormat === 'webp' && isWebPSupported) {
            // 使用WebP格式
            compressedImage = canvas.toDataURL('image/webp', quality);
            const base64WithoutHeader = compressedImage.split(',')[1];
            compressedFileSize = Math.round((base64WithoutHeader.length * 3) / 4);
        } else if (compressFormat === 'jpeg') {
            // 强制使用JPEG
            compressedImage = canvas.toDataURL('image/jpeg', quality);
            const base64WithoutHeader = compressedImage.split(',')[1];
            compressedFileSize = Math.round((base64WithoutHeader.length * 3) / 4);
        } else {
            // 自动选择
            let formats = ['image/jpeg'];
            if (hasAlpha && isWebPSupported) {
                formats.push('image/webp');
            }
            
            // 尝试所有支持的格式，选择最小的
            let bestFormat = formats[0];
            let bestData = canvas.toDataURL(bestFormat, quality);
            let bestSize = Math.round((bestData.split(',')[1].length * 3) / 4);
            
            for (let i = 1; i < formats.length; i++) {
                let testData = canvas.toDataURL(formats[i], quality);
                let testSize = Math.round((testData.split(',')[1].length * 3) / 4);
                if (testSize < bestSize) {
                    bestFormat = formats[i];
                    bestData = testData;
                    bestSize = testSize;
                }
            }
            
            compressedImage = bestData;
            compressedFileSize = bestSize;
        }
        
        // 显示压缩后的图片
        displayCompressedImage(compressedImage);
        updateCompressedInfo();
        enableDownloadButton();
    };
    
    img.src = originalImage;
}

// 检测图片是否包含透明通道
function checkImageHasAlpha(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // 获取图片数据
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // 检查是否有像素的alpha通道值小于255（不完全不透明）
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
            return true;
        }
    }
    
    return false;
}

// 显示压缩后的图片
function displayCompressedImage(imageData) {
    const preview = document.getElementById('compressedPreview');
    preview.innerHTML = `<img src="${imageData}" alt="压缩后">`;
}

// 更新压缩后信息
function updateCompressedInfo() {
    const info = document.getElementById('compressedInfo');
    const compressedSize = (compressedFileSize / 1024).toFixed(2);
    const compressionRatio = ((1 - compressedFileSize / originalFileSize) * 100).toFixed(1);
    
    info.innerHTML = `
        <p>文件大小: ${compressedSize} KB</p>
        <p>压缩率: ${compressionRatio}%</p>
    `;
}

// 启用下载按钮
function enableDownloadButton() {
    document.getElementById('downloadButton').disabled = false;
}

// 下载按钮事件
const downloadButton = document.getElementById('downloadButton');
downloadButton.addEventListener('click', downloadImage);

// 下载图片
function downloadImage() {
    if (!compressedImage) return;
    
    const link = document.createElement('a');
    link.href = compressedImage;
    // 根据压缩格式设置文件名
    let fileName;
    if (compressedImage.includes('image/webp')) {
        fileName = 'compressed-image.webp';
    } else if (compressedImage.includes('image/png')) {
        fileName = 'compressed-image.png';
    } else {
        fileName = 'compressed-image.jpg';
    }
    link.download = fileName;
    link.click();
}

// 重置按钮事件
const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', resetForm);

// 重置表单
function resetForm() {
    originalImage = null;
    compressedImage = null;
    originalFileSize = 0;
    compressedFileSize = 0;
    
    // 重置上传区域
    imageInput.value = '';
    
    // 重置预览
    document.getElementById('originalPreview').innerHTML = `
        <i class="fas fa-image placeholder-icon"></i>
        <p>原图预览</p>
    `;
    
    document.getElementById('compressedPreview').innerHTML = `
        <i class="fas fa-image placeholder-icon"></i>
        <p>压缩后预览</p>
    `;
    
    // 重置信息
    document.getElementById('originalInfo').innerHTML = `
        <p>文件大小: -</p>
        <p>尺寸: -</p>
    `;
    
    document.getElementById('compressedInfo').innerHTML = `
        <p>文件大小: -</p>
        <p>压缩率: -</p>
    `;
    
    // 禁用按钮
    document.getElementById('compressButton').disabled = true;
    document.getElementById('downloadButton').disabled = true;
    
    // 重置质量滑块
    qualitySlider.value = 70;
    qualityValue.textContent = '70%';
}
</script>

<?php
include 'menu.php';
include 'footer.php';
?>
