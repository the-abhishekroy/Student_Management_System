document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const searchParams = new URLSearchParams(formData);
    
    try {
        const response = await fetch(`/students/search?${searchParams}`);
        const students = await response.json();
        updateStudentsList(students);
    } catch (err) {
        console.error('Error searching students:', err);
    }
});

function updateStudentsList(students) {
    const studentsList = document.querySelector('.students-list');
    studentsList.innerHTML = students.map(student => `
        <div class="card student-card">
            <h3>${student.name}</h3>
            <p>ID: ${student.studentId}</p>
            <p>Course: ${student.course}</p>
            <p>GPA: ${student.gpa}</p>
            <p>Attendance: ${calculateAttendance(student.attendance)}%</p>
            <div class="card-actions">
                <a href="/students/edit/${student._id}" class="btn">Edit</a>
                <button onclick="exportPDF('${student._id}')" class="btn">Export PDF</button>
                <form action="/students/delete/${student._id}" method="POST" style="display: inline;">
                    <button type="submit" class="btn btn-danger">Delete</button>
                </form>
            </div>
        </div>
    `).join('');
}

function calculateAttendance(attendance) {
    if (!attendance || attendance.length === 0) return 0;
    const present = attendance.filter(a => a.status === 'present').length;
    return ((present / attendance.length) * 100).toFixed(2);
}

async function exportPDF(studentId) {
    window.location.href = `/students/${studentId}/export-pdf`;
}

async function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            const response = await fetch(`/api/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Error deleting student');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting student');
        }
    }
}

async function editStudent(studentId) {
    window.location.href = `/students/edit/${studentId}`;
} 