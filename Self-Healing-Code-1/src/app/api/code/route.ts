import { NextResponse } from "next/server";

const promptMaker = (changes: string, inputSchema: string, outputSchema: string, dataSources: string) => {
    return `You are an expert code generator. Generate ONLY code without any explanation.

**Task:** ${changes}

**Constraints:**
- Write correct, optimized code with minimum lines
- Include clear comments/docstrings
- Code should be production-ready
- Strictly follow the input and output schemas
- Respond with ONLY the code, no explanations

**Input Schema:** ${inputSchema}
**Output Schema:** ${outputSchema}
${dataSources ? `**Data Sources:** ${dataSources}` : ""}

Start with the programming language on the first line (e.g., python, javascript) then the code.`;
}

export async function GET(request: any) {
    try {
        const changes = request.nextUrl.searchParams.get("changes");
        const inputSchema = request.nextUrl.searchParams.get("inputSchema");
        const outputSchema = request.nextUrl.searchParams.get("outputSchema");
        const dataSources = request.nextUrl.searchParams.get("dataSources");

        console.log("Query Parameters:", { changes, inputSchema, outputSchema, dataSources })
        
        // Validate that required parameters are provided
        if (!changes || !inputSchema || !outputSchema) {
            return NextResponse.json({ 
                error: "Missing required parameters: changes, inputSchema, and outputSchema are required" 
            }, { status: 400 });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("GROQ_API_KEY is not set");
            return NextResponse.json({ 
                error: "GROQ_API_KEY is not configured" 
            }, { status: 500 });
        }

        console.log("Calling Groq API...");
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: promptMaker(changes, inputSchema, outputSchema, dataSources),
                    },
                ],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Groq API Error Response:", errorData);
            throw new Error(`Groq API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const output = data.choices[0]?.message?.content || "";
        
        console.log("Groq Response:", output);

        // Parse the response
        const outputAsArray = output.split("\n").filter((line: string) => line.trim());
        const genLang = outputAsArray[0]?.replace(/```/g, "").trim() || "python";
        const genCode = outputAsArray.slice(1).join("\n").replace(/```/g, "").trim();

        console.log("Parsed - Language:", genLang, "Code length:", genCode.length);

        return NextResponse.json({ 
            code: genCode, 
            language: genLang 
        }, { status: 200 });
    } catch (error: any) {
        console.error("Error:", error);
        console.error("Error Message:", error.message);
        return NextResponse.json({ 
            error: error.message || "Internal Server Error",
        }, { status: 500 });
    }
}