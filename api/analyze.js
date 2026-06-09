import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { imageData, mimeType } = req.body;
    if (!imageData) return res.status(400).json({ error: 'No image data' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageData }
          },
          {
            type: 'text',
            text: `You are a professional medical imaging AI. Carefully analyze this bone X-ray image.
Return ONLY valid JSON, no markdown, no explanation:
{
  "detected": true or false,
  "type": "avulsion|comminuted|dislocation|greenstick|hairline|impacted|longitudinal|oblique|pathological|spiral|unclear",
  "confidence": 0-100,
  "severity": "none|mild|moderate|severe",
  "location": "precise anatomical location in English",
  "location_zh": "精确解剖位置（中文）",
  "observations": ["finding 1", "finding 2", "finding 3"],
  "observations_zh": ["发现1", "发现2", "发现3"],
  "quality": "poor|fair|good|excellent",
  "bboxes": [
    {"label": "骨折检测", "label_en": "Fracture", "confidence": 0-100, "color": "blue", "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0},
    {"label": "断裂特征", "label_en": "Feature", "confidence": 0-100, "color": "red", "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0}
  ]
}
For bboxes: x,y is top-left corner, w,h is width/height, all as fraction of image size (0.0 to 1.0). Include 1-3 boxes highlighting fracture regions. If no fracture detected, return empty array.`
          }
        ]
      }]
    });

    const raw = message.content[0].text.replace(/^```json?\s*/,'').replace(/\s*```$/,'').trim();
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
