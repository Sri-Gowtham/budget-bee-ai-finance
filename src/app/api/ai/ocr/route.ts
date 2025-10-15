import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/jpeg";

    // Use OpenAI Vision API to extract receipt data
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt/invoice image and extract the following information in JSON format:
{
  "merchant": "store/merchant name",
  "amount": "total amount as number",
  "date": "date in YYYY-MM-DD format",
  "category": "one of: groceries, dining, shopping, transport, utilities, entertainment, health, education, other",
  "items": ["list of items if visible"],
  "confidence": "high/medium/low based on image clarity"
}

If the image is not a receipt or the information cannot be extracted, return an error field with an explanation.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to extract data from image" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = content.replace(/```json\n?|\n?```/g, "").trim();
      extractedData = JSON.parse(jsonText);
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse extracted data", rawContent: content },
        { status: 500 }
      );
    }

    if (extractedData.error) {
      return NextResponse.json(
        { error: extractedData.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process image" },
      { status: 500 }
    );
  }
}