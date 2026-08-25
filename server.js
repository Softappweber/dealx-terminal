const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const FYERS_BASE = 'https://api-t1.fyers.in/api/v3';

app.get('/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/token', async (req, res) => {
    try {
        const { authCode } = req.body;
        
        console.log('Token request received');
        console.log('App ID Hash:', process.env.FYERS_APP_ID_HASH ? 'Set' : 'NOT SET');
        
        const response = await axios.post(FYERS_BASE + '/validate-authcode', {
            grant_type: 'authorization_code',
            appIdHash: process.env.FYERS_APP_ID_HASH,
            code: authCode
        });
        
        console.log('FYERS Token Response:', JSON.stringify(response.data));
        res.json(response.data);
    } catch (e) {
        console.error('Token Error:', e.response?.data || e.message);
        res.status(500).json({ 
            error: e.response?.data?.message || e.message,
            details: e.response?.data || null
        });
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const response = await axios.get(FYERS_BASE + '/profile', {
            headers: { 'Authorization': token }
        });
        res.json(response.data.data || response.data);
    } catch (e) {
        console.error('Profile Error:', e.response?.data || e.message);
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
        console.error('Order Error:', e.response?.data || e.message);
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
        console.error('Orders Error:', e.response?.data || e.message);
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
        console.error('Positions Error:', e.response?.data || e.message);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log('DealX Terminal running on port ' + PORT);
});

module.exports = app;