import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const contentTypeConfigs = [
  {
    type: 'gaming',
    name: 'Gaming Content',
    description: 'Highlights kills, reactions, epic moments and gameplay',
    icon: '🎮',
    audioEnergyWeight: 0.8,
    visualMotionWeight: 0.9,
    speechPatternWeight: 0.6,
    sceneChangeWeight: 0.7,
    excitementKeywords: ['wow', 'omg', 'insane', 'crazy', 'unbelievable', 'epic', 'amazing'],
    actionKeywords: ['kill', 'death', 'win', 'lose', 'clutch', 'headshot', 'achievement', 'victory'],
    emotionalKeywords: ['funny', 'rage', 'epic', 'fail', 'lucky', 'unlucky', 'excited'],
    technicalKeywords: ['strategy', 'build', 'combo', 'technique', 'skill', 'play'],
    minClipLength: 15,
    maxClipLength: 60,
    preferredClipLength: 30,
    maxSegments: 10,
    minimumConfidence: 0.7,
    geminiFlashPromptTemplate: `Analyze this gaming video segment for highlight-worthy moments. Look for:
- Epic kills, clutch plays, skill displays
- Funny reactions, rage moments, unexpected events
- Achievement unlocks, rare occurrences
- Intense action sequences with high energy audio
- Player reactions to wins/losses/surprises

Focus on moments with high emotional intensity, exciting gameplay, and entertaining commentary.`,
    geminiProPromptTemplate: `You are an expert gaming video editor. Review these candidate gaming segments and create the final highlights optimized for social media sharing. Prioritize viral gaming moments, epic plays, and entertaining reactions.`,
    embeddingQueryTemplate: 'epic gaming moment with incredible skill display and crowd cheering'
  },
  {
    type: 'podcast',
    name: 'Podcast/Interview',
    description: 'Extracts engaging conversations, insights and funny moments',
    icon: '🎙️',
    audioEnergyWeight: 0.9,
    visualMotionWeight: 0.2,
    speechPatternWeight: 1.0,
    sceneChangeWeight: 0.3,
    excitementKeywords: ['exactly', 'absolutely', 'incredible', 'fascinating', 'interesting'],
    actionKeywords: ['argument', 'debate', 'discussion', 'point', 'example', 'story'],
    emotionalKeywords: ['hilarious', 'touching', 'controversial', 'surprising', 'shocking'],
    technicalKeywords: ['insight', 'theory', 'research', 'study', 'data', 'analysis'],
    minClipLength: 30,
    maxClipLength: 90,
    preferredClipLength: 60,
    maxSegments: 6,
    minimumConfidence: 0.6,
    geminiFlashPromptTemplate: `Analyze this podcast/interview segment for engaging moments. Look for:
- Insightful revelations, key takeaways
- Funny exchanges, witty banter, humorous stories
- Heated debates, passionate arguments
- Emotional moments, personal stories
- Surprising statements, controversial topics

Focus on conversational peaks with engaging dialogue and meaningful content.`,
    geminiProPromptTemplate: `You are an expert podcast editor. Review these candidate conversation segments and create the final highlights that would perform best as social media clips. Prioritize insights, humor, and engaging dialogue.`,
    embeddingQueryTemplate: 'insightful revelation with passionate explanation and engaged discussion'
  },
  {
    type: 'vlog',
    name: 'Vlog/Lifestyle',
    description: 'Captures emotional reactions, activities and authentic moments',
    icon: '📱',
    audioEnergyWeight: 0.7,
    visualMotionWeight: 0.6,
    speechPatternWeight: 0.8,
    sceneChangeWeight: 0.5,
    excitementKeywords: ['amazing', 'beautiful', 'love', 'incredible', 'perfect'],
    actionKeywords: ['travel', 'adventure', 'experience', 'activity', 'explore', 'discover'],
    emotionalKeywords: ['happy', 'excited', 'surprised', 'emotional', 'touching', 'heartwarming'],
    technicalKeywords: ['tip', 'advice', 'recommendation', 'review', 'tutorial'],
    minClipLength: 20,
    maxClipLength: 75,
    preferredClipLength: 45,
    maxSegments: 8,
    minimumConfidence: 0.65,
    geminiFlashPromptTemplate: `Analyze this vlog segment for captivating moments. Look for:
- Emotional reactions, genuine expressions
- Beautiful scenery, interesting activities
- Social interactions, meeting people
- Unexpected events, spontaneous moments
- Personal revelations, life updates

Focus on authentic, relatable moments with visual interest and emotional engagement.`,
    geminiProPromptTemplate: `You are an expert lifestyle content editor. Review these candidate vlog segments and create the final highlights that showcase authentic, engaging moments perfect for social media sharing.`,
    embeddingQueryTemplate: 'authentic emotional moment with genuine reaction and relatability'
  },
  {
    type: 'tutorial',
    name: 'Tutorial/Educational',
    description: 'Identifies key explanations, demonstrations and learning moments',
    icon: '📚',
    audioEnergyWeight: 0.6,
    visualMotionWeight: 0.8,
    speechPatternWeight: 0.9,
    sceneChangeWeight: 0.6,
    excitementKeywords: ['important', 'key', 'essential', 'critical', 'breakthrough'],
    actionKeywords: ['step', 'process', 'method', 'technique', 'demonstration', 'example'],
    emotionalKeywords: ['success', 'achievement', 'breakthrough', 'eureka', 'satisfied'],
    technicalKeywords: ['explain', 'how to', 'tutorial', 'guide', 'instruction', 'learn'],
    minClipLength: 45,
    maxClipLength: 120,
    preferredClipLength: 75,
    maxSegments: 5,
    minimumConfidence: 0.75,
    geminiFlashPromptTemplate: `Analyze this tutorial segment for educational highlights. Look for:
- Key explanations of important concepts
- Demonstration of techniques or skills
- Before/after comparisons, results reveals
- Problem-solving moments, troubleshooting
- Tips, tricks, and best practices

Focus on instructional value and clear demonstrations of learning points.`,
    geminiProPromptTemplate: `You are an expert educational content editor. Review these candidate tutorial segments and create the final highlights that provide maximum educational value in short, digestible clips.`,
    embeddingQueryTemplate: 'clear educational explanation with visual demonstration'
  }
];

async function seedContentTypes() {
  console.log('Seeding content type configurations...');

  for (const config of contentTypeConfigs) {
    try {
      await prisma.contentTypeConfig.upsert({
        where: { type: config.type },
        update: config,
        create: config
      });
      console.log(`✓ Seeded ${config.name} configuration`);
    } catch (error) {
      console.error(`✗ Failed to seed ${config.name}:`, error);
    }
  }

  console.log('Content type seeding completed!');
}

async function main() {
  await seedContentTypes();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });