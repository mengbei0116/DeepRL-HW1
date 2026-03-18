document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("grid-size");
    const display = document.getElementById("size-display");
    const gridContainer = document.getElementById("grid-container");
    const statusText = document.getElementById("status-text");

    let currentStep = 'start'; // start, end, obstacle, done
    let obstaclesPlaced = 0;
    let maxObstacles = 0;

    function updateStatusText() {
        if (currentStep === 'start') {
            statusText.textContent = "目前的步驟：請點擊設定「起始點 (綠色)」";
            gridContainer.className = "placing-start";
        } else if (currentStep === 'end') {
            statusText.textContent = "目前的步驟：請點擊設定「終點 (紅色)」";
            gridContainer.className = "placing-end";
        } else if (currentStep === 'obstacle') {
            statusText.textContent = `目前的步驟：請點擊設定「障礙物 (灰色)」 (${obstaclesPlaced}/${maxObstacles})`;
            gridContainer.className = "placing-obstacle";
        } else {
            statusText.textContent = "設定完成！";
            gridContainer.className = "placing-done";
        }
    }

    function handleCellClick(e) {
        const cell = e.target;
        // 忽略已經被設定的格子
        if (cell.classList.contains('start') || cell.classList.contains('end') || cell.classList.contains('obstacle')) {
            return;
        }

        if (currentStep === 'start') {
            cell.classList.add('start');
            currentStep = 'end';
            updateStatusText();
        } else if (currentStep === 'end') {
            cell.classList.add('end');
            currentStep = 'obstacle';
            updateStatusText();
        } else if (currentStep === 'obstacle') {
            cell.classList.add('obstacle');
            obstaclesPlaced++;
            
            updateStatusText();

            if (obstaclesPlaced >= maxObstacles) {
                currentStep = 'done';
                updateStatusText();
                
                // 等待0.5秒後請求初始矩陣
                setTimeout(() => {
                    generateMatricesOnServer();
                }, 500);
            }
        }
    }

    function generateMatricesOnServer() {
        const n = parseInt(slider.value);
        let start = null;
        let end = null;
        const obstacles = [];

        const cells = gridContainer.querySelectorAll('.cell');
        cells.forEach((cell) => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (cell.classList.contains('start')) start = [r, c];
            else if (cell.classList.contains('end')) end = [r, c];
            else if (cell.classList.contains('obstacle')) obstacles.push([r, c]);
        });

        fetch('/api/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n, start, end, obstacles })
        })
        .then(res => res.json())
        .then(data => {
            renderMatrices(n, data.value_matrix, data.policy_matrix, start);
            document.getElementById("btn-vi").style.display = "block";
        });
    }

    function renderMatrices(n, valueMatrix, policyMatrix, startPos) {
        const panel = document.getElementById("matrices-panel");
        const originGrid = document.querySelector(".grid-wrapper");
        const vContainer = document.getElementById("value-container");
        const pContainer = document.getElementById("policy-container");
        
        panel.style.display = "flex";
        originGrid.style.display = "none";
        
        vContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        vContainer.style.gridTemplateRows = `repeat(${n}, 1fr)`;
        pContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        pContainer.style.gridTemplateRows = `repeat(${n}, 1fr)`;
        
        vContainer.innerHTML = '';
        pContainer.innerHTML = '';
        
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                // Value cell
                const vCell = document.createElement("div");
                vCell.classList.add("matrix-cell");
                // dynamically adjust font size for large iteration values if necessary
                vCell.style.fontSize = "0.7rem";
                vCell.textContent = valueMatrix[r][c].toFixed(2);
                
                // Set appropriate classes based on policy
                if (policyMatrix[r][c] === 'G') vCell.classList.add('end');
                else if (policyMatrix[r][c] === 'X') vCell.classList.add('obstacle');
                else if (startPos && r === startPos[0] && c === startPos[1]) vCell.classList.add('start'); // color start based on coords
                
                vContainer.appendChild(vCell);
                
                // Policy cell
                const pCell = document.createElement("div");
                pCell.classList.add("matrix-cell");
                pCell.style.fontWeight = 'bold';
                pCell.textContent = policyMatrix[r][c];
                
                if (policyMatrix[r][c] === 'G') pCell.classList.add('end');
                else if (policyMatrix[r][c] === 'X') pCell.classList.add('obstacle');
                else if (startPos && r === startPos[0] && c === startPos[1]) pCell.classList.add('start');
                
                pContainer.appendChild(pCell);
            }
        }
    }

    function highlightOptimalPath(n, finalPolicy, startPos) {
        if (!startPos) return;
        const pContainer = document.getElementById("policy-container");
        const vContainer = document.getElementById("value-container");
        
        let currentPos = startPos;
        let count = 0;
        const maxSteps = n * n; // prevent loops
        
        while (count < maxSteps) {
            const r = currentPos[0];
            const c = currentPos[1];
            const action = finalPolicy[r][c];
            
            const isStart = (r === startPos[0] && c === startPos[1]);
            const isEnd = (action === 'G');
            
            // 跳過起點與終點，維持它們原本的顏色
            if (!isStart && !isEnd) {
                const idx = r * n + c;
                if (pContainer.children[idx]) {
                    pContainer.children[idx].classList.add("optimal-path");
                }
                if (vContainer.children[idx]) {
                    vContainer.children[idx].classList.add("optimal-path");
                }
            }
            
            if (action === 'G' || action === 'X' || !action) break;
            
            let dr = 0, dc = 0;
            if (action === '↑') dr = -1;
            else if (action === '↓') dr = 1;
            else if (action === '←') dc = -1;
            else if (action === '→') dc = 1;
            else break;
            
            const nextR = r + dr;
            const nextC = c + dc;
            
            if (nextR < 0 || nextR >= n || nextC < 0 || nextC >= n) {
                break;
            }
            currentPos = [nextR, nextC];
            count++;
        }
    }

    function renderGrid(n) {
        display.textContent = n;
        
        // Hide matrices panel on reset 
        document.getElementById("matrices-panel").style.display = "none";
        document.querySelector(".grid-wrapper").style.display = "flex";
        
        const btnVi = document.getElementById("btn-vi");
        btnVi.style.display = "none";
        btnVi.disabled = false;
        btnVi.textContent = "開始進行價值迭代";
        
        // 重置狀態
        currentStep = 'start';
        obstaclesPlaced = 0;
        maxObstacles = n - 2;
        updateStatusText();
        
        // Update CSS grid columns and rows based on N
        gridContainer.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${n}, 1fr)`;
        
        // Clear previous grid cells
        gridContainer.innerHTML = '';
        
        // Create new cells for N x N
        const totalCells = n * n;
        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            
            // Optional data attributes for coordinates
            const row = Math.floor(i / n);
            const col = i % n;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 綁定點擊事件
            cell.addEventListener("click", handleCellClick);
            
            gridContainer.appendChild(cell);
        }
    }

    // Initial grid render
    renderGrid(slider.value);

    // Event listener for the slider
    slider.addEventListener("input", (e) => {
        renderGrid(e.target.value);
    });

    document.getElementById("btn-vi").addEventListener("click", () => {
        const btnVi = document.getElementById("btn-vi");
        btnVi.disabled = true;
        btnVi.textContent = "迭代中...";
        
        const n = parseInt(slider.value);
        let start = null;
        let end = null;
        const obstacles = [];

        const cells = gridContainer.querySelectorAll('.cell');
        cells.forEach((cell) => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (cell.classList.contains('start')) start = [r, c];
            else if (cell.classList.contains('end')) end = [r, c];
            else if (cell.classList.contains('obstacle')) obstacles.push([r, c]);
        });
        
        fetch('/api/value_iteration_full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ n, start, end, obstacles })
        })
        .then(res => res.json())
        .then(data => {
            const steps = data.steps;
            let stepIdx = 0;
            const intervalId = setInterval(() => {
                if (stepIdx >= steps.length) {
                    clearInterval(intervalId);
                    btnVi.textContent = "迭代完成！";
                    
                    const finalValueMatrix = steps[steps.length - 1].value_matrix;
                    // Check if value of start point is 0, which means unreachable
                    if (start && finalValueMatrix[start[0]][start[1]] === 0.0) {
                        alert("提示：目前的障礙物完全阻礙了道路，無法計算出到達終點的最佳路徑！");
                    } else {
                        // Highlight the optimal path using the final policy
                        highlightOptimalPath(n, steps[steps.length - 1].policy_matrix, start);
                    }
                    
                    return;
                }
                renderMatrices(n, steps[stepIdx].value_matrix, steps[stepIdx].policy_matrix, start);
                stepIdx++;
            }, 250); // 每 250ms 可視化更新一次迭代
        });
    });
});
