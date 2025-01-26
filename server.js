const express = require("express");
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

const dbPath = path.join(__dirname, 'data', 'students.json');

async function readDB() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { students: [] };
    }
}

async function writeDB(data) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

app.get('/', async (req, res) => {
    try {
        const db = await readDB();
        const totalStudents = db.students.length;
        const averageGPA = db.students.reduce((acc, student) => acc + student.gpa, 0) / totalStudents || 0;
        const recentStudents = db.students.slice(-5).reverse();
        res.render('dashboard', { totalStudents, averageGPA, recentStudents });
    } catch (error) {
        res.status(500).send('Error loading dashboard');
    }
});

app.get('/students/add', (req, res) => {
    res.render('add-student');
});

app.get('/students', async (req, res) => {
    try {
        const db = await readDB();
        res.render('students-list', { students: db.students });
    } catch (error) {
        res.status(500).send('Error loading students');
    }
});

app.get('/students/edit/:id', async (req, res) => {
    try {
        const db = await readDB();
        const student = db.students.find(s => s.id === req.params.id);
        if (!student) {
            return res.status(404).send('Student not found');
        }
        res.render('edit-student', { student });
    } catch (error) {
        res.status(500).send('Error loading student');
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const db = await readDB();
        const newStudent = {
            id: generateId(),
            studentId: req.body.studentId,
            name: req.body.name,
            email: req.body.email,
            course: req.body.course,
            gpa: parseFloat(req.body.gpa),
            joinDate: new Date().toISOString()
        };
        
        db.students.push(newStudent);
        await writeDB(db);
        res.status(201).json({ success: true, message: 'Student added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error adding student' });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const db = await readDB();
        const { query, sortBy, filterCourse, minGPA } = req.query;
        
        let filteredStudents = db.students;

        if (query) {
            const searchQuery = query.toLowerCase();
            filteredStudents = filteredStudents.filter(student => 
                student.name.toLowerCase().includes(searchQuery) ||
                student.studentId.toLowerCase().includes(searchQuery) ||
                student.email.toLowerCase().includes(searchQuery)
            );
        }

        if (filterCourse) {
            filteredStudents = filteredStudents.filter(student => 
                student.course === filterCourse
            );
        }

        if (minGPA) {
            filteredStudents = filteredStudents.filter(student => 
                student.gpa >= parseFloat(minGPA)
            );
        }

        if (sortBy) {
            filteredStudents.sort((a, b) => {
                switch(sortBy) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'gpa':
                        return b.gpa - a.gpa;
                    case 'course':
                        return a.course.localeCompare(b.course);
                    default:
                        return 0;
                }
            });
        }

        res.json(filteredStudents);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching students' });
    }
});

app.put('/api/students/:id', async (req, res) => {
    try {
        const db = await readDB();
        const index = db.students.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Student not found' });
        }

        db.students[index] = {
            ...db.students[index],
            studentId: req.body.studentId,
            name: req.body.name,
            email: req.body.email,
            course: req.body.course,
            gpa: parseFloat(req.body.gpa)
        };

        await writeDB(db);
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating student' });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        const db = await readDB();
        db.students = db.students.filter(student => student.id !== req.params.id);
        await writeDB(db);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting student' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 