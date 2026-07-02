import app from './app.js'
import receiptRoutes from './routes/receipts.js'

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)) 
app.use('/api/receipts', receiptRoutes)

process.on("uncaughtException", (err) => {
    console.error(err);
});

process.on("unhandledRejection", (err) => {
    console.error(err);
});