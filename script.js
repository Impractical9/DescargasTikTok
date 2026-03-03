class TikTokDownloader {
    constructor() {
        // Múltiples APIs para probar secuencialmente
        this.apis = [
            {
                name: 'tikwm',
                url: 'https://tikwm.com/api/',
                method: 'GET',
                active: true
            },
            {
                name: 'ssstik',
                url: 'https://ssstik.io/abc?url=dl',
                method: 'POST',
                active: false // Necesita proxy
            },
            {
                name: 'tikmate',
                url: 'https://tikmate.app/api/lookup',
                method: 'POST',
                active: true
            },
            {
                name: 'tiktokdl',
                url: 'https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/analysis',
                method: 'GET',
                active: false // Necesita API key
            }
        ];
        
        // Elementos del DOM
        this.urlInput = document.getElementById('urlInput');
        this.fetchBtn = document.getElementById('fetchBtn');
        this.loading = document.getElementById('loading');
        this.resultSection = document.getElementById('resultSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.thumbnail = document.getElementById('thumbnail');
        this.videoInfo = document.getElementById('videoInfo');
        this.videoDetails = document.getElementById('videoDetails');
        this.qualityOptions = document.getElementById('qualityOptions');
        this.qualityButtons = document.getElementById('qualityButtons');
        
        // Botones de descarga
        this.downloadVideoBtn = document.getElementById('downloadVideoBtn');
        this.downloadAudioBtn = document.getElementById('downloadAudioBtn');
        this.downloadThumbnailBtn = document.getElementById('downloadThumbnailBtn');
        
        // Datos del video actual
        this.currentVideoData = null;
        
        // Inicializar eventos
        this.initEvents();
    }
    
    initEvents() {
        this.fetchBtn.addEventListener('click', () => this.fetchVideo());
        this.downloadVideoBtn.addEventListener('click', () => this.downloadVideo());
        this.downloadAudioBtn.addEventListener('click', () => this.downloadAudio());
        this.downloadThumbnailBtn.addEventListener('click', () => this.downloadThumbnail());
        
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fetchVideo();
        });
    }
    
    async fetchVideo() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Por favor, ingresa una URL de TikTok');
            return;
        }
        
        if (!this.isValidTikTokUrl(url)) {
            this.showError('Por favor, ingresa una URL válida de TikTok');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        this.hideResult();
        
        // Probar APIs activas secuencialmente
        const activeApis = this.apis.filter(api => api.active);
        
        for (let i = 0; i < activeApis.length; i++) {
            const api = activeApis[i];
            console.log(`Intentando con API: ${api.name}`);
            
            try {
                const data = await this.tryApi(api, url);
                if (data && data.videoUrl) {
                    this.currentVideoData = data;
                    this.displayVideoInfo(data);
                    this.showResult();
                    this.showLoading(false);
                    console.log(`Éxito con API: ${api.name}`);
                    return;
                }
            } catch (error) {
                console.log(`API ${api.name} falló:`, error.message);
                continue;
            }
        }
        
        this.showLoading(false);
        this.showError('No se pudo obtener el video. Intenta con otra URL o prueba más tarde.');
    }
    
    async tryApi(apiConfig, tiktokUrl) {
        try {
            let response;
            let data;
            
            if (apiConfig.name === 'tikwm') {
                // API de tikwm.com (normalmente funciona)
                const apiUrl = `${apiConfig.url}?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
                
                // Usar proxy CORS si es necesario
                const proxyUrl = 'https://corsproxy.io/?';
                const fullUrl = proxyUrl + encodeURIComponent(apiUrl);
                
                response = await fetch(fullUrl);
                const result = await response.json();
                
                // Parsear el contenido del proxy
                if (result.contents) {
                    data = JSON.parse(result.contents);
                } else {
                    data = result;
                }
                
                if (data.data && data.data.play) {
                    return {
                        author: data.data.author?.nickname || 'Usuario TikTok',
                        title: data.data.title || 'Video de TikTok',
                        cover: data.data.cover,
                        videoUrl: data.data.play,
                        videoUrlHd: data.data.hdplay || data.data.play,
                        musicUrl: data.data.music,
                        duration: data.data.duration,
                        api: 'tikwm'
                    };
                }
            }
            else if (apiConfig.name === 'tikmate') {
                // API de tikmate.app (alternativa)
                const formData = new URLSearchParams();
                formData.append('url', tiktokUrl);
                
                response = await fetch(apiConfig.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: formData
                });
                
                data = await response.json();
                
                if (data.video_url) {
                    return {
                        author: data.author_name || 'Usuario TikTok',
                        title: data.title || 'Video de TikTok',
                        cover: data.thumbnail_url,
                        videoUrl: data.video_url,
                        videoUrlHd: data.video_url_hd || data.video_url,
                        musicUrl: data.music_url,
                        duration: data.duration,
                        api: 'tikmate'
                    };
                }
            }
            else if (apiConfig.name === 'ssstik') {
                // Usar un proxy para ssstik.io
                const proxyUrl = 'https://corsproxy.io/?';
                const targetUrl = `https://ssstik.io/abc?url=${encodeURIComponent(tiktokUrl)}`;
                
                response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                
                const text = await response.text();
                
                // Parsear HTML para extraer datos (simplificado)
                const videoUrlMatch = text.match(/"videoUrl":"([^"]+)"/);
                const audioUrlMatch = text.match(/"audioUrl":"([^"]+)"/);
                const thumbnailMatch = text.match(/"cover":"([^"]+)"/);
                
                if (videoUrlMatch) {
                    return {
                        author: 'Usuario TikTok',
                        title: 'Video de TikTok',
                        cover: thumbnailMatch ? thumbnailMatch[1].replace(/\\/g, '') : '',
                        videoUrl: videoUrlMatch[1].replace(/\\/g, ''),
                        musicUrl: audioUrlMatch ? audioUrlMatch[1].replace(/\\/g, '') : '',
                        api: 'ssstik'
                    };
                }
            }
            
            return null;
            
        } catch (error) {
            console.error(`Error en API ${apiConfig.name}:`, error);
            throw error;
        }
    }
    
    displayVideoInfo(data) {
        // Mostrar información básica
        this.videoInfo.innerHTML = `
            <p>🎬 <strong>${data.author || 'Usuario TikTok'}</strong></p>
            <p>${data.title || 'Video de TikTok'}</p>
            <p class="api-source">Fuente: ${data.api || 'API'}</p>
        `;
        
        // Configurar video player
        if (data.videoUrl) {
            this.videoPlayer.src = data.videoUrl;
            this.videoPlayer.style.display = 'block';
            this.videoPlayer.load();
        }
        
        // Mostrar miniatura
        if (data.cover) {
            this.thumbnail.src = data.cover;
            this.thumbnail.style.display = 'block';
        }
        
        // Mostrar detalles
        let detailsHtml = '<h4>📋 Detalles del video:</h4>';
        detailsHtml += `<p><strong>Autor:</strong> ${data.author || 'No disponible'}</p>`;
        detailsHtml += `<p><strong>Descripción:</strong> ${data.title || 'No disponible'}</p>`;
        
        if (data.duration) {
            detailsHtml += `<p><strong>Duración:</strong> ${data.duration} segundos</p>`;
        }
        
        if (data.api) {
            detailsHtml += `<p><strong>API utilizada:</strong> ${data.api}</p>`;
        }
        
        this.videoDetails.innerHTML = detailsHtml;
        
        // Mostrar opciones de calidad
        this.qualityOptions.style.display = 'block';
        this.qualityButtons.innerHTML = '';
        
        // Botón para calidad normal
        if (data.videoUrl) {
            const btnNormal = document.createElement('button');
            btnNormal.className = 'btn-success';
            btnNormal.innerHTML = '<i class="fas fa-download"></i> Calidad Normal';
            btnNormal.onclick = () => this.downloadFromUrl(data.videoUrl, 'tiktok_video_normal.mp4');
            this.qualityButtons.appendChild(btnNormal);
        }
        
        // Botón para calidad HD si está disponible
        if (data.videoUrlHd && data.videoUrlHd !== data.videoUrl) {
            const btnHD = document.createElement('button');
            btnHD.className = 'btn-success';
            btnHD.innerHTML = '<i class="fas fa-download"></i> Calidad HD';
            btnHD.onclick = () => this.downloadFromUrl(data.videoUrlHd, 'tiktok_video_hd.mp4');
            this.qualityButtons.appendChild(btnHD);
        }
    }
    
    downloadVideo() {
        if (!this.currentVideoData) return;
        
        let videoUrl = '';
        let filename = 'tiktok_video.mp4';
        
        // Preferir calidad HD si está disponible
        if (this.currentVideoData.videoUrlHd) {
            videoUrl = this.currentVideoData.videoUrlHd;
            filename = 'tiktok_video_hd.mp4';
        } else if (this.currentVideoData.videoUrl) {
            videoUrl = this.currentVideoData.videoUrl;
        }
        
        if (videoUrl) {
            this.downloadFromUrl(videoUrl, filename);
        } else {
            this.showError('No se encontró enlace de descarga para el video');
        }
    }
    
    downloadAudio() {
        if (!this.currentVideoData) return;
        
        if (this.currentVideoData.musicUrl) {
            this.downloadFromUrl(this.currentVideoData.musicUrl, 'tiktok_audio.mp3');
        } else {
            // Si no hay URL de audio directa, intentar extraer del video
            this.showError('Audio no disponible. Descarga el video y extrae el audio después.');
        }
    }
    
    downloadThumbnail() {
        if (!this.currentVideoData) return;
        
        if (this.currentVideoData.cover) {
            this.downloadFromUrl(this.currentVideoData.cover, 'tiktok_thumbnail.jpg');
        } else {
            this.showError('No se encontró miniatura para descargar');
        }
    }
    
    downloadFromUrl(url, filename) {
        // Mostrar mensaje de descarga
        this.showMessage(`Iniciando descarga: ${filename}`, 'success');
        
        // Crear un enlace temporal para la descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        // Para algunos servidores necesitamos usar un proxy
        const proxyUrl = 'https://corsproxy.io/?';
        
        // Intentar descarga directa
        fetch(proxyUrl + encodeURIComponent(url), { mode: 'no-cors' })
            .then(() => {
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(() => {
                // Si falla, intentamos abrir en nueva pestaña
                window.open(url, '_blank');
                this.showMessage('Abriendo video en nueva pestaña...', 'info');
            });
    }
    
    isValidTikTokUrl(url) {
        const tiktokPatterns = [
            /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/.+/,
            /^(https?:\/\/)?(m\.)?tiktok\.com\/.+/,
            /^(https?:\/\/)?tiktok\.com\/@[^\/]+\/video\/\d+/,
            /^(https?:\/\/)?vm\.tiktok\.com\/[^\/]+/,
            /^(https?:\/\/)?vt\.tiktok\.com\/[^\/]+/
        ];
        
        return tiktokPatterns.some(pattern => pattern.test(url));
    }
    
    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
        this.fetchBtn.disabled = show;
        
        if (show) {
            this.fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        } else {
            this.fetchBtn.innerHTML = '<i class="fas fa-download"></i> Obtener Video';
        }
    }
    
    showResult() {
        this.resultSection.style.display = 'block';
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    hideResult() {
        this.resultSection.style.display = 'none';
        this.videoPlayer.style.display = 'none';
        this.thumbnail.style.display = 'none';
        this.videoPlayer.src = '';
        this.thumbnail.src = '';
    }
    
    showError(message) {
        this.errorMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Error:</strong> ${message}
            <br><br>
            <small>Consejos:
            <ul>
                <li>Asegúrate que el video sea público</li>
                <li>Intenta con otra URL de TikTok</li>
                <li>Espera unos minutos y vuelve a intentar</li>
            </ul>
            </small>
        `;
        this.errorMessage.style.display = 'block';
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Estilos temporales para el mensaje
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(messageDiv), 300);
        }, 3000);
    }
    
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    // Método para probar URLs de ejemplo
    testExample() {
        const examples = [
            'https://www.tiktok.com/@example/video/1234567890123456789',
            'https://vm.tiktok.com/ZMJwCwVfD/',
            'https://vt.tiktok.com/ZSJwCwVfD/'
        ];
        
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        this.urlInput.value = randomExample;
        this.showMessage('URL de ejemplo cargada. Haz clic en "Obtener Video"', 'info');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.downloader = new TikTokDownloader();
    
    // Agregar animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .api-source {
            font-size: 0.8rem;
            color: #666;
            font-style: italic;
            margin-top: 5px;
        }
        .message.success {
            background: #4CAF50 !important;
        }
        .message.info {
            background: #2196F3 !important;
        }
        .message i {
            margin-right: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // Botón de ejemplo
    //const exampleBtn = document.createElement('button');
    //exampleBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Cargar Ejemplo';
    exampleBtn.className = 'btn-success';
    exampleBtn.style.marginLeft = '10px';
    exampleBtn.onclick = () => window.downloader.testExample();
    
    const inputGroup = document.querySelector('.input-group');
    inputGroup.appendChild(exampleBtn);
});