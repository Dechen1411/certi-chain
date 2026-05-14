async function main() {
    const loginUrl = "http://localhost:4000/api/auth/login";
    const issueUrl = "http://localhost:4000/api/certificates/issue";

    try {
        console.log("Logging in...");
        const loginResponse = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: "admin",
                password: "Admin2026Secure"
            })
        });

        console.log("Login Status:", loginResponse.status);
        const loginData = await loginResponse.json();
        console.log("Login Response:", JSON.stringify(loginData));

        const cookie = loginResponse.headers.get("set-cookie");
        console.log("Captured Cookie:", cookie);

        console.log("Issuing certificate...");
        const issueResponse = await fetch(issueUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": cookie || ""
            },
            body: JSON.stringify({
                studentName: "John Doe",
                studentEmail: "john.doe@university.edu",
                studentWalletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                certificateType: "Bachelors of Science",
                department: "Computer Science",
                grade: "A",
                issueDate: "2026-04-21",
                completionDate: "2026-04-20",
                studentId: "STU001"
            })
        });

        console.log("Issue Status:", issueResponse.status);
        const issueData = await issueResponse.json();
        console.log("Issue Response:", JSON.stringify(issueData));

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

main();
