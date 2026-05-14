const axios = require("axios");

async function main() {
    const loginUrl = "http://localhost:4000/api/auth/login";
    const issueUrl = "http://localhost:4000/api/certificates/issue";

    try {
        console.log("Logging in...");
        const loginResponse = await axios.post(loginUrl, {
            identifier: "admin",
            password: "Admin2026Secure"
        }, {
            withCredentials: true
        });

        console.log("Login Status:", loginResponse.status);
        console.log("Login Response:", JSON.stringify(loginResponse.data));

        const cookie = loginResponse.headers["set-cookie"];
        console.log("Captured Cookie:", cookie);

        console.log("Issuing certificate...");
        const issueResponse = await axios.post(issueUrl, {
            studentName: "John Doe",
            studentEmail: "john.doe@university.edu",
            studentWalletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            certificateType: "Bachelors of Science",
            department: "Computer Science",
            grade: "A",
            issueDate: "2026-04-21",
            completionDate: "2026-04-20",
            studentId: "STU001"
        }, {
            headers: {
                Cookie: cookie ? cookie.join("; ") : ""
            }
        });

        console.log("Issue Status:", issueResponse.status);
        console.log("Issue Response:", JSON.stringify(issueResponse.data));

    } catch (error) {
        console.error("An error occurred:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data));
        } else {
            console.error(error.message);
        }
    }
}

main();
