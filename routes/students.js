const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).single('profileImage');

// Search, Sort and Filter
router.get('/search', async (req, res) => {
    try {
        const { query, sortBy, filterCourse, minGPA } = req.query;
        
        let searchQuery = {};
        if (query) {
            searchQuery = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { studentId: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ]
            };
        }
        
        if (filterCourse) {
            searchQuery.course = filterCourse;
        }
        
        if (minGPA) {
            searchQuery.gpa = { $gte: parseFloat(minGPA) };
        }
        
        let sortOption = {};
        switch(sortBy) {
            case 'name':
                sortOption = { name: 1 };
                break;
            case 'gpa':
                sortOption = { gpa: -1 };
                break;
            case 'course':
                sortOption = { course: 1 };
                break;
            default:
                sortOption = { name: 1 };
        }
        
        const students = await Student.find(searchQuery).sort(sortOption);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attendance tracking
router.post('/:id/attendance', async (req, res) => {
    try {
        const { date, status } = req.body;
        const student = await Student.findById(req.params.id);
        
        student.attendance.push({ date: new Date(date), status });
        await student.save();
        
        res.json({ message: 'Attendance marked successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Grade management
router.post('/:id/grades', async (req, res) => {
    try {
        const { subject, marks, maxMarks, semester } = req.body;
        const student = await Student.findById(req.params.id);
        
        student.grades.push({ subject, marks, maxMarks, semester });
        student.gpa = student.calculateCGPA();
        await student.save();
        
        res.json({ message: 'Grades added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export to PDF
router.get('/:id/export-pdf', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=student_${student.studentId}.pdf`);
        
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(25).text('Student Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Name: ${student.name}`);
        doc.text(`Student ID: ${student.studentId}`);
        doc.text(`Course: ${student.course}`);
        doc.text(`GPA: ${student.gpa}`);
        doc.text(`Attendance: ${student.getAttendancePercentage().toFixed(2)}%`);
        
        // Add grades table
        doc.moveDown();
        doc.text('Grades:', { underline: true });
        student.grades.forEach(grade => {
            doc.text(`${grade.subject}: ${grade.marks}/${grade.maxMarks} (Semester: ${grade.semester})`);
        });
        
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export to CSV
router.get('/export-csv', async (req, res) => {
    try {
        const students = await Student.find();
        
        const csvWriter = createCsvWriter({
            path: 'students.csv',
            header: [
                { id: 'studentId', title: 'Student ID' },
                { id: 'name', title: 'Name' },
                { id: 'email', title: 'Email' },
                { id: 'course', title: 'Course' },
                { id: 'gpa', title: 'GPA' }
            ]
        });
        
        await csvWriter.writeRecords(students);
        res.download('students.csv');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 