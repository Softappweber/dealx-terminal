let accessToken = null;
let userProfile = null;
let watchlist = ['NSE:RELIANCE-EQ', 'NSE:TCS-EQ', 'NSE:INFY-EQ', 'NSE:HDFCBANK-EQ', 'NSE:SBIN-EQ'];
let currentSymbol = 'NSE:RELIANCE-EQ';
let ws = null;

function loginWithFyers() {
    const appId = document.getElementById('appIdInput').value.trim();
    if (!appId) { alert('FYERS App ID daalo!'); return; }
    
    localStorage.setItem('fyersAppId', appId);
    
    const redirectUri = window.location.origin + '/callback';
    const authUrl = 'https://api-t1.fyers.in/api/v3/generate-authcode' +
        '?client_id=' + appId +
        '&redirect_uri=' + encodeURIComponent(redirectUri) +
        '&response_type=code' +
        '&state=sample_state';
    
    window.location.href = authUrl;
}

async function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('auth_code');
    
    if (authCode) {
        const clientId = localStorage.getItem('clientId');
        const response = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authCode, clientId })
        });
        
        const data = await response.json();
        if (data.access_token) {
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            showTerminal();
            loadUserProfile();
            startWebSocket();
        }
    }
}

function showTerminal() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('terminalScreen').classList.remove('hidden');
    loadWatchlist();
    loadChart(currentSymbol);
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/profile', {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await response.json();
        userProfile = data;
        document.getElementById('userName').textContent = data.name || 'Trader';
    } catch (e) {
        console.error('Profile error:', e);
    }
}

function loadWatchlist() {
    const el = document.getElementById('watchlistItems');
    el.innerHTML = watchlist.map(symbol => {
        return '<div class="stock-item" onclick="selectStock(\'' + symbol + '\')">' +
            '<span>' + symbol.replace('NSE:', '').replace('-EQ', '') + '</span>' +
            '<span class="stock-price" id="price_' + symbol + '">--</span>' +
        '</div>';
    }).join('');
}

function selectStock(symbol) {
    currentSymbol = symbol;
    loadChart(symbol);
}

function loadChart(symbol) {
    const cleanSymbol = symbol.replace('NSE:', '').replace('-EQ', '');
    new TradingView.widget({
        container_id: 'chart',
        symbol: 'NSE:' + cleanSymbol,
        interval: '1',
        theme: 'dark',
        style: '1',
        locale: 'in',
        toolbar_bg: '#161b22',
        enable_publishing: false,
        allow_symbol_change: true,
        height: '100%'
    });
}

function searchStock(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.toUpperCase();
        if (query) {
            const symbol = 'NSE:' + query + '-EQ';
            if (!watchlist.includes(symbol)) {
                watchlist.push(symbol);
                loadWatchlist();
            }
            selectStock(symbol);
            e.target.value = '';
        }
    }
}

function startWebSocket() {
    ws = new WebSocket('wss://api-t1.fyers.in/socket/v2?access_token=' + accessToken);
    
    ws.onopen = function() {
        subscribeToWatchlist();
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updatePrices(data);
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

function subscribeToWatchlist() {
    const symbols = watchlist.map(s => s.replace('NSE:', '').replace('-EQ', ''));
    const msg = {
        type: 'subscribe',
        symbols: symbols
    };
    ws.send(JSON.stringify(msg));
}

function updatePrices(data) {
    if (data && data.ltp) {
        const symbol = 'NSE:' + data.symbol + '-EQ';
        const priceEl = document.getElementById('price_' + symbol);
        if (priceEl) {
            priceEl.textContent = '₹' + data.ltp.toFixed(2);
        }
    }
}

async function placeOrder(side) {
    if (!accessToken) { alert('Login first!'); return; }
    
    const symbol = document.getElementById('orderSymbol').value;
    const qty = parseInt(document.getElementById('orderQty').value);
    const type = parseInt(document.getElementById('orderType').value);
    const price = parseFloat(document.getElementById('orderPrice').value) || 0;
    
    if (!symbol || !qty) { alert('Symbol aur Quantity bharo!'); return; }
    
    const orderData = {
        symbol: symbol,
        qty: qty,
        type: type,
        side: side === 1 ? 1 : -1,
        productType: 'INTRADAY',
        limitPrice: price,
        stopPrice: 0,
        validity: 'DAY',
        disclosedQty: 0,
        offlineOrder: false
    };
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        if (data.s === 'ok') {
            alert('Order placed successfully! ID: ' + data.id);
            loadOrders();
            loadPositions();
        } else {
            alert('Order failed: ' + (data.message || 'Error'));
        }
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function loadOrders() {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await response.json();
        
        const el = document.getElementById('ordersList');
        if (data.orderBook && data.orderBook.length > 0) {
            el.innerHTML = data.orderBook.map(order => {
                return '<div class="order-item">' +
                    '<span>' + order.symbol + '</span>' +
                    '<span>' + (order.side === 1 ? 'BUY' : 'SELL') + '</span>' +
                    '<span>Qty: ' + order.qty + '</span>' +
                    '<span style="color:' + (order.status === 1 ? 'var(--green)' : 'var(--red)') + '">' + order.statusText + '</span>' +
                '</div>';
            }).join('');
        } else {
            el.innerHTML = '<p>No orders</p>';
        }
    } catch (e) {
        console.error('Orders error:', e);
    }
}

async function loadPositions() {
    try {
        const response = await fetch('/api/positions', {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await response.json();
        
        const el = document.getElementById('positionsList');
        if (data.netPositions && data.netPositions.length > 0) {
            el.innerHTML = data.netPositions.map(pos => {
                const pnl = pos.pl || 0;
                const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)';
                return '<div class="stock-item">' +
                    '<span>' + pos.symbol + '</span>' +
                    '<span>Qty: ' + pos.netQty + '</span>' +
                    '<span style="color:' + pnlColor + '">₹' + pnl.toFixed(2) + '</span>' +
                '</div>';
            }).join('');
        } else {
            el.innerHTML = '<p>No positions</p>';
        }
    } catch (e) {
        console.error('Positions error:', e);
    }
}

function logout() {
    accessToken = null;
    localStorage.removeItem('accessToken');
    if (ws) ws.close();
    location.reload();
}

let fyersConnect = null;

window.onload = function() {
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
        accessToken = savedToken;
        showTerminal();
        loadUserProfile();
        startWebSocket();
        loadOrders();
        loadPositions();
    } else if (window.location.pathname === '/callback') {
        handleCallback();
    }
};

function loginWithFyers() {
    fyersConnect = new FyersApiConnect({
        appId: localStorage.getItem('fyersAppId'),
        redirectUri: window.location.origin + '/callback'
    });
    
    fyersConnect.login();
}

function handleCallback() {
    fyersConnect = new FyersApiConnect({
        appId: localStorage.getItem('fyersAppId'),
        redirectUri: window.location.origin + '/callback'
    });
    
    fyersConnect.handleCallback(function(response) {
        if (response.status === 'success') {
            accessToken = response.access_token;
            localStorage.setItem('accessToken', accessToken);
            showTerminal();
            loadUserProfile();
            startWebSocket();
            loadOrders();
            loadPositions();
        }
    });
}
