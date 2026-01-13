import Image from 'next/image';

export default function ViralFontsShowcase() {
  const fonts = [
    {
      name: "Montserrat",
      description: "Best Subtitle Font Overall",
      sample: "SUBSCRIBE FOR MORE!",
      color: "#FFFFFF",
      outline: "#000000",
      useCase: "Universal - Works for any content"
    },
    {
      name: "Rubik",
      description: "Best Caption Font For Videos With Punchy Messages",
      sample: "DON'T SKIP THIS!",
      color: "#FFE600",
      outline: "#000000",
      useCase: "Motivational, Highlights, Key Moments"
    },
    {
      name: "Gabarito (Work Sans)",
      description: "Good Subtitle Font For Fitness Shorts and TikTok",
      sample: "JUST DO IT!",
      color: "#FF4444",
      outline: "#FFFFFF",
      useCase: "Workout Videos, Fitness Tips"
    },
    {
      name: "Poppins",
      description: "Best Caption Font For Educational Videos",
      sample: "Learn Something New",
      color: "#4A90E2",
      outline: "#FFFFFF",
      useCase: "Tutorials, Explanations, Education"
    },
    {
      name: "DM Serif Display",
      description: "Best Video Font For Storytelling",
      sample: "Once Upon a Time...",
      color: "#F5F5DC",
      outline: "#8B4513",
      useCase: "Stories, Documentaries, Drama"
    },
    {
      name: "Circular (Nunito Sans)",
      description: "Good Font For Videos With Strong Visuals",
      sample: "BREATHTAKING VIEWS",
      color: "#FFFFFF",
      outline: "#1a1a1a",
      useCase: "Cinematic, Music Videos"
    },
    {
      name: "Roboto",
      description: "Best Font For Health Videos",
      sample: "Stay Healthy!",
      color: "#00D9B1",
      outline: "#FFFFFF",
      useCase: "Medical, Health Tips, Wellness"
    },
    {
      name: "Arial",
      description: "Good Caption Font For Professional Videos",
      sample: "Business Growth",
      color: "#2C3E50",
      outline: "#FFFFFF",
      useCase: "Corporate, Business, Professional"
    }
  ];

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-4xl font-bold text-white mb-2 text-center">
        Viral Subtitle Fonts
      </h1>
      <p className="text-gray-400 text-center mb-12">
        Professional fonts optimized for maximum engagement
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {fonts.map((font, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">
                {font.name}
              </h3>
              <p className="text-sm text-gray-400">{font.description}</p>
            </div>

            <div
              className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 rounded-lg p-8 mb-4 flex items-center justify-center min-h-[120px]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              <span
                style={{
                  fontFamily: font.name,
                  fontSize: '32px',
                  color: font.color,
                  fontWeight: 'bold',
                  textShadow: `
                    -2px -2px 0 ${font.outline},
                    2px -2px 0 ${font.outline},
                    -2px 2px 0 ${font.outline},
                    2px 2px 0 ${font.outline},
                    0 0 8px ${font.outline},
                    0 0 16px rgba(0,0,0,0.8)
                  `,
                  letterSpacing: '0.5px'
                }}
              >
                {font.sample}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border-2"
                  style={{
                    backgroundColor: font.color,
                    borderColor: font.outline,
                    boxShadow: `0 0 8px ${font.outline}`
                  }}
                />
                <span className="text-xs text-gray-400">Text Color</span>
              </div>
              <span className="text-xs text-blue-400">{font.useCase}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 max-w-4xl mx-auto bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-3">
          Pro Tips for Viral Subtitles
        </h3>
        <ul className="space-y-2 text-gray-300">
          <li><strong>Use high contrast</strong> - Text should pop against any background</li>
          <li><strong>Bold is better</strong> - Most viral videos use bold subtitles</li>
          <li><strong>Size matters</strong> - 24-32px works best for most platforms</li>
          <li><strong>Match the vibe</strong> - Choose fonts that match your content type</li>
          <li><strong>Stay consistent</strong> - Use the same style throughout your video</li>
        </ul>
      </div>
    </div>
  );
}
