import app from './app.js'

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)) 

process.on("uncaughtException", (err) => {
    console.error(err);
});

process.on("unhandledRejection", (err) => {
    console.error(err);
});
