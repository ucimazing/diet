const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/india-diet')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const RDA = {
    sodium: 2000, iron: 17, magnesium: 340, potassium: 3500, calcium: 1000,
    vitaminA: 900, vitaminC: 40, vitaminB1: 1.2, vitaminB6: 2.0, vitaminB12: 1,
};

const FoodSchema = new mongoose.Schema({
    name: String,
    calories: Number,
    macros: { protein: Number, carbs: Number, fat: Number },
    micros: {
        sodium: Number, iron: Number, magnesium: Number, potassium: Number, calcium: Number,
        vitaminA: Number, vitaminC: Number, vitaminB1: Number, vitaminB6: Number, vitaminB12: Number,
    },
    category: [String],
    region: String,
});
const Food = mongoose.model('Food', FoodSchema);

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    history: [{
        date: Date,
        meals: [{ foodId: mongoose.Schema.Types.ObjectId, qty: Number }],
        totals: {
            calories: Number, protein: Number, carbs: Number, fat: Number,
            micros: {
                sodium: Number, iron: Number, magnesium: Number, potassium: Number, calcium: Number,
                vitaminA: Number, vitaminC: Number, vitaminB1: Number, vitaminB6: Number, vitaminB12: Number,
            },
        },
    }],
});
const User = mongoose.model('User', UserSchema);

app.get('/foods/search', async (req, res) => {
    const { q } = req.query;
    console.log('Search query:', q);
    const results = await Food.find({ name: { $regex: q, $options: 'i' } }).limit(5);
    res.json(results);
});

// ... other routes ...

async function seedData() {
    try {
        await Food.deleteMany({});
        await Food.insertMany([
            {
                name: 'Chicken Grilled', calories: 165, macros: { protein: 31, carbs: 0, fat: 3.5 },
                micros: { sodium: 70, iron: 1, magnesium: 25, potassium: 250, calcium: 15, vitaminB6: 0.5, vitaminB12: 0.3 },
                category: ['high-protein', 'non-veg'], region: 'Pan-India',
            },
            {
                name: 'Paneer Tikka', calories: 300, macros: { protein: 18, carbs: 5, fat: 20 },
                micros: { sodium: 400, calcium: 200, magnesium: 20, potassium: 100, iron: 0.5 },
                category: ['high-protein', 'veg'], region: 'North India',
            },
            {
                name: 'Pasta Whole Wheat', calories: 131, macros: { protein: 5, carbs: 25, fat: 1 },
                micros: { magnesium: 40, iron: 1.5, potassium: 100, vitaminB1: 0.2 },
                category: ['high-fiber'], region: 'Pan-India',
            },
            {
                name: 'Samosa', calories: 300, macros: { protein: 4, carbs: 30, fat: 15 },
                micros: { sodium: 500, iron: 1, potassium: 150 },
                category: ['avoid'], region: 'Pan-India',
            },
        ]);
        console.log('Data seeded successfully');
    } catch (err) {
        console.error('Seeding error:', err);
    }
}

// Seed data then start server
seedData()
    .then(() => {
        app.listen(3000, () => console.log('Server on port 3000'));
    })
    .catch(err => console.error('Startup error:', err));