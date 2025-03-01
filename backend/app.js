const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const app = express();

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/diet', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'));

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
    const results = await Food.find({ name: { $regex: q, $options: 'i' } }).limit(5);
    res.json(results);
});

app.get('/foods/top', async (req, res) => {
    const { goal } = req.query;
    const results = await Food.find({ category: goal }).limit(10);
    res.json(results);
});

app.post('/meals', async (req, res) => {
    const { userId, foods } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let totals = {
        calories: 0, protein: 0, carbs: 0, fat: 0,
        micros: { sodium: 0, iron: 0, magnesium: 0, potassium: 0, calcium: 0,
            vitaminA: 0, vitaminC: 0, vitaminB1: 0, vitaminB6: 0, vitaminB12: 0 },
    };

    for (const { foodId, qty } of foods) {
        const food = await Food.findById(foodId);
        if (food) {
            const factor = qty / 100;
            totals.calories += food.calories * factor;
            totals.protein += food.macros.protein * factor;
            totals.carbs += food.macros.carbs * factor;
            totals.fat += food.macros.fat * factor;
            for (const [key, value] of Object.entries(food.micros)) {
                totals.micros[key] += (value || 0) * factor;
            }
        }
    }

    const status = {};
    for (const [key, value] of Object.entries(totals.micros)) {
        status[key] = { consumed: value, required: RDA[key], percentage: (value / RDA[key]) * 100 };
    }

    user.history.push({ date: new Date(), meals: foods, totals: { ...totals, status } });
    await user.save();
    res.json({ message: 'Meal added', totals, status });
});

app.get('/user/:id/history', async (req, res) => {
    const { id } = req.params;
    const { range } = req.query;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let startDate;
    switch (range) {
        case 'weekly': startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
        case 'monthly': startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(0);
    }

    const filteredHistory = user.history.filter(h => h.date >= startDate);
    res.json(filteredHistory);
});

app.post('/foods/missing', (req, res) => {
    const { name, userId } = req.body;
    const entry = `${name},${userId},${new Date().toISOString()}\n`;
    fs.appendFile('missing-foods.csv', entry, (err) => {
        if (err) return res.status(500).json({ error: 'File write failed' });
        res.json({ message: 'Logged locally' });
    });
});

async function seedData() {
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
    console.log('Data seeded');
}
// seedData(); // Uncomment to seed

app.listen(3000, () => console.log('Server on port 3000'));