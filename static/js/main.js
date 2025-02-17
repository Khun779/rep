document.addEventListener('DOMContentLoaded', function() {
    const downloadForm = document.getElementById('downloadForm');
    const videoUrl = document.getElementById('videoUrl');
    const fetchFormatsBtn = document.getElementById('fetchFormats');
    const formatSelect = document.getElementById('formatSelect');
    const formatSelectContainer = document.getElementById('formatSelectContainer');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadProgress = document.getElementById('downloadProgress');
    const progressBar = downloadProgress.querySelector('.progress-bar');
    const downloadStatus = document.getElementById('downloadStatus');
    const historyList = document.getElementById('historyList');

    let currentDownloadId = null;

    fetchFormatsBtn.addEventListener('click', async () => {
        const url = videoUrl.value.trim();
        if (!url) {
            alert('Please enter a valid URL');
            return;
        }

        try {
            fetchFormatsBtn.disabled = true;
            fetchFormatsBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';

            const response = await fetch('/get-formats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            formatSelect.innerHTML = '<option value="">Choose format...</option>';
            data.formats.forEach(format => {
                const option = document.createElement('option');
                option.value = format.format_id;
                option.textContent = `${format.description} (${format.ext})`;
                formatSelect.appendChild(option);
            });

            formatSelectContainer.style.display = 'block';
            downloadBtn.disabled = false;

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            fetchFormatsBtn.disabled = false;
            fetchFormatsBtn.innerHTML = '<i class="bi bi-search"></i> Get Formats';
        }
    });

    downloadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const url = videoUrl.value.trim();
        const format = formatSelect.value;

        if (!url || !format) {
            alert('Please fill in all fields');
            return;
        }

        try {
            downloadBtn.disabled = true;
            downloadProgress.style.display = 'block';
            
            const response = await fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            currentDownloadId = data.download_id;
            monitorProgress(currentDownloadId);

            // Add to history
            const historyItem = document.createElement('div');
            historyItem.className = 'list-group-item';
            historyItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${url}</h6>
                        <small class="text-muted">Format: ${formatSelect.options[formatSelect.selectedIndex].text}</small>
                    </div>
                    <span class="badge bg-primary" id="history-${data.download_id}">0%</span>
                </div>
            `;
            historyList.insertBefore(historyItem, historyList.firstChild);

        } catch (error) {
            alert('Error: ' + error.message);
            resetForm();
        }
    });

    function monitorProgress(downloadId) {
        const progressInterval = setInterval(async () => {
            try {
                const response = await fetch(`/progress/${downloadId}`);
                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                const progress = Math.round(data.progress);
                progressBar.style.width = `${progress}%`;
                progressBar.textContent = `${progress}%`;

                // Update history badge
                const historyBadge = document.getElementById(`history-${downloadId}`);
                if (historyBadge) {
                    historyBadge.textContent = `${progress}%`;
                }

                downloadStatus.textContent = data.status;

                if (data.status === 'finished' || data.status === 'error') {
                    clearInterval(progressInterval);
                    if (data.status === 'error') {
                        alert('Download error: ' + data.error);
                    }
                    resetForm();
                }

            } catch (error) {
                clearInterval(progressInterval);
                alert('Error monitoring progress: ' + error.message);
                resetForm();
            }
        }, 1000);
    }

    function resetForm() {
        downloadBtn.disabled = false;
        downloadProgress.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        downloadStatus.textContent = 'Preparing download...';
        currentDownloadId = null;
    }
});
