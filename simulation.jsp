<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Autonomous Drone Optimization Visualizer</title>
    <link rel="stylesheet" href="style.css" />
</head>
<body>
    <header>
        <h1>Multi-Agent Drone Delivery Optimization</h1>
        <p>Real-Time Pathfinding and Collision-Free Navigation</p>
    </header>

    <div class="container">
        <aside class="sidebar">
            <h2>Controls</h2>
            <button id="start-btn">Start Simulation</button>
            <button id="reset-btn">Reset</button>

            <h2>Live Metrics</h2>

            <div class="metric-card">
                <span>Drone 1 Battery</span>
                <div class="bar-bg">
                    <div id="d1-bat" class="bar-fill">100%</div>
                </div>
            </div>

            <div class="metric-card">
                <span>Drone 2 Battery</span>
                <div class="bar-bg">
                    <div id="d2-bat" class="bar-fill">100%</div>
                </div>
            </div>

            <h2>Status</h2>
            <p id="status-text">Waiting to start...</p>
        </aside>

        <main class="grid-wrapper">
            <div id="city-grid" class="grid"></div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>