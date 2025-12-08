const crypto = require('crypto');
const fetch = require('node-fetch');

class PaymentService {
    constructor() {
        this.shopId = process.env.CRYPTO_SHOP_ID;
        this.apiKey = process.env.CRYPTO_API_KEY;
        this.baseUrl = 'https://api.cryptocloud.plus';
        
        if (this.shopId && this.apiKey) {
            console.log('CryptoCloud API инициализирован');
        } else {
            console.log('CryptoCloud ключи не найдены, используется демо-режим');
        }
    }

    async createPayment(params) {
        if (!this.shopId || !this.apiKey) {
            return this.createDemoPayment(params);
        }

        try {
            const paymentData = {
                shop_id: this.shopId,
                amount: params.amount.toString(),
                currency: params.currency || 'RUB',
                order_id: `chefzero-${Date.now()}`,
                description: params.description
            };

            const signature = this.createSignature(paymentData);

            const response = await fetch(`${this.baseUrl}/v1/invoice/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${this.apiKey}`,
                    'Signature': signature
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (result.status === 'success') {
                return {
                    id: result.data.invoice_id,
                    invoice_url: result.data.pay_url,
                    amount: result.data.amount,
                    currency: result.data.currency,
                    status: result.data.status
                };
            } else {
                throw new Error(result.message || 'Ошибка создания платежа');
            }

        } catch (error) {
            console.error('Ошибка создания платежа:', error);
            return this.createDemoPayment(params);
        }
    }

    async checkPaymentStatus(invoiceId) {
        if (!this.apiKey || invoiceId.startsWith('demo_')) {
            return 'paid';
        }

        try {
            const response = await fetch(`${this.baseUrl}/v1/invoice/info?invoice_id=${invoiceId}`, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.status === 'success') {
                return result.data.status;
            } else {
                return 'failed';
            }

        } catch (error) {
            console.error('Ошибка проверки статуса:', error);
            return 'failed';
        }
    }

    createSignature(data) {
        const jsonData = JSON.stringify(data);
        return crypto
            .createHmac('sha256', this.apiKey)
            .update(jsonData)
            .digest('hex');
    }

    createDemoPayment(params) {
        return {
            id: `demo_${Date.now()}`,
            invoice_url: 'https://cryptocloud.plus/demo',
            amount: params.amount,
            currency: params.currency,
            status: 'pending',
            demo: true
        };
    }
}

module.exports = new PaymentService();
