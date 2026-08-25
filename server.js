const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const FYERS_BASE = 'https://api-t1.fyers.in/api/v3';

app.post('/api/token', async (req, res) => {
    try {
        const { authCode, clientId } = req.body;
        
        const response = await axios.post(FYERS_BASE + '/validate-authcode', {
            grant_type: 'authorization_code',
            appIdHash: process.env.FYERS_APP_ID_HASH,
            code: authCode
        });
        
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const response = await axios.get(FYERS_BASE + '/profile', {
            headers: { 'Authorization': token }
        });
        res.json(response.data.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/order', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const response = await axios.post(FYERS_BASE + '/orders/sync', req.body, {
            headers: { 'Authorization': token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const response = await axios.get(FYERS_BASE + '/orders', {
            headers: { 'Authorization': token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/positions', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const response = await axios.get(FYERS_BASE + '/positions', {
            headers: { 'Authorization': token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log('TradeX Terminal running on port ' + PORT);
});