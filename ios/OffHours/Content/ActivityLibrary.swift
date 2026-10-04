import Foundation

enum ActivityLibrary {
    static let all: [Activity] = [
        Activity(
            id: "sunset-walk",
            title: "Phone-free sunset walk",
            summary: "Leave your phone at home and walk slowly for 25 minutes. Notice the light changing and let your thoughts wander.",
            kind: .nature, minutes: 25,
            interests: [.walking, .nature],
            times: [.afternoon, .evening],
            place: .park,
            steps: ["Leave your phone behind, or put it on Do Not Disturb.", "Walk slower than feels normal.", "Notice three things you have never seen on this route."]
        ),
        Activity(
            id: "waterfront-sit",
            title: "Sit by the water",
            summary: "Find a bench near the water and watch it move for 20 minutes. No podcast, no scrolling, just the view.",
            kind: .nature, minutes: 20,
            interests: [.nature, .meditation],
            times: [.afternoon, .evening],
            place: .waterfront
        ),
        Activity(
            id: "tree-sit",
            title: "Sit under a tree",
            summary: "Find a large tree, sit with your back against it, and stay still for 15 minutes. Listen to what's around you.",
            kind: .nature, minutes: 15,
            interests: [.nature, .meditation],
            times: [.morning, .afternoon, .evening],
            place: .park
        ),
        Activity(
            id: "photo-walk",
            title: "Five-photo walk",
            summary: "Walk for half an hour and take exactly five photos of small details: a door, a leaf, a shadow. Choose carefully.",
            kind: .creative, minutes: 30,
            interests: [.photography, .walking, .art],
            times: [.morning, .afternoon, .evening],
            place: .park
        ),
        Activity(
            id: "park-sketch",
            title: "Sketch what you see",
            summary: "Bring paper and a pen to a park and sketch one scene for 20 minutes. It's for you, so it doesn't need to be good.",
            kind: .creative, minutes: 20,
            interests: [.art],
            times: [.afternoon, .evening],
            place: .park,
            bring: ["Paper", "Pen or pencil"]
        ),
        Activity(
            id: "cafe-reading",
            title: "Read at a café",
            summary: "Take a paper book to a café, order something warm, and read for 40 minutes with your phone in your bag.",
            kind: .mindful, minutes: 40,
            interests: [.reading, .coffeeAndTea],
            times: [.morning, .afternoon, .evening],
            place: .cafe,
            bring: ["A book"]
        ),
        Activity(
            id: "library-wander",
            title: "Library wander",
            summary: "Go to the library, walk the shelves without a plan, and read the first page of three books you'd never normally pick.",
            kind: .creative, minutes: 30,
            interests: [.reading, .writing],
            times: [.afternoon, .evening],
            place: .library
        ),
        Activity(
            id: "museum-one-piece",
            title: "Look at one painting",
            summary: "Visit a museum and spend ten full minutes in front of a single piece. Then wander and let something surprise you.",
            kind: .creative, minutes: 45,
            interests: [.art],
            times: [.afternoon, .evening],
            place: .museum
        ),
        Activity(
            id: "cafe-letter",
            title: "Write a letter by hand",
            summary: "Sit somewhere cozy and write a real letter to someone you miss. You can decide later whether to send it.",
            kind: .social, minutes: 25,
            interests: [.writing, .conversation, .coffeeAndTea],
            times: [.afternoon, .evening],
            place: .cafe,
            bring: ["Paper", "Pen"]
        ),
        Activity(
            id: "walk-and-call",
            title: "Walk and call a friend",
            summary: "Call someone you haven't spoken to in a while and go for a walk while you talk. Voice only, no video.",
            kind: .social, minutes: 30,
            interests: [.conversation, .walking],
            times: [.afternoon, .evening],
            place: .park
        ),
        Activity(
            id: "cook-together",
            title: "Cook something simple together",
            summary: "Invite a friend or housemate to cook one simple dish with you. Pay attention to the process, not the result.",
            kind: .social, minutes: 60,
            interests: [.cooking, .conversation],
            times: [.evening]
        ),
        Activity(
            id: "neighbor-hello",
            title: "Check in on a neighbor",
            summary: "Knock on a neighbor's door to say hello, or bring something small. Ten minutes of real conversation counts.",
            kind: .community, minutes: 15,
            interests: [.community, .conversation],
            times: [.afternoon, .evening]
        ),
        Activity(
            id: "breathing",
            title: "Ten slow breaths",
            summary: "Sit somewhere quiet, close your eyes, and take ten slow breaths. Then stay for a few minutes and notice how you feel.",
            kind: .mindful, minutes: 10,
            interests: [.meditation],
            times: [.morning, .afternoon, .evening, .night]
        ),
        Activity(
            id: "gratitude",
            title: "Three good things",
            summary: "Write down three good things from today, however small, and one sentence about why each one mattered.",
            kind: .mindful, minutes: 10,
            interests: [.journaling, .writing],
            times: [.evening, .night],
            bring: ["Notebook", "Pen"]
        ),
        Activity(
            id: "tea-ritual",
            title: "Tea, slowly",
            summary: "Make a cup of tea or coffee and drink all of it sitting down, doing nothing else. Notice the warmth and the taste.",
            kind: .mindful, minutes: 15,
            interests: [.coffeeAndTea, .meditation],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "sound-sit",
            title: "Just listen",
            summary: "Sit by an open window or outside and listen for 15 minutes. Count how many different sounds you can pick out.",
            kind: .mindful, minutes: 15,
            interests: [.meditation, .nature],
            times: [.morning, .afternoon, .evening, .night]
        ),
        Activity(
            id: "body-scan",
            title: "Body scan",
            summary: "Lie down and slowly move your attention from your toes to the top of your head. Let each part soften.",
            kind: .mindful, minutes: 20,
            interests: [.meditation, .movement],
            times: [.evening, .night]
        ),
        Activity(
            id: "mindful-meal",
            title: "One quiet meal",
            summary: "Eat dinner without a screen. Put your fork down between bites and taste what you're eating.",
            kind: .mindful, minutes: 25,
            interests: [.cooking, .meditation],
            times: [.afternoon, .evening]
        ),
        Activity(
            id: "stretch",
            title: "Gentle stretch",
            summary: "Roll your shoulders, stretch your back, and touch your toes. Move however your body asks to after a day of sitting.",
            kind: .movement, minutes: 15,
            interests: [.movement],
            times: [.morning, .afternoon, .evening, .night]
        ),
        Activity(
            id: "yoga-flow",
            title: "Simple yoga flow",
            summary: "Do a slow 20-minute flow from memory. Match each movement to a breath, and skip anything that doesn't feel right.",
            kind: .movement, minutes: 20,
            interests: [.movement, .meditation],
            times: [.morning, .evening]
        ),
        Activity(
            id: "kitchen-dance",
            title: "Kitchen dance",
            summary: "Put on three songs you love and dance like nobody's watching, because nobody is.",
            kind: .movement, minutes: 12,
            interests: [.music, .movement],
            times: [.afternoon, .evening, .night]
        ),
        Activity(
            id: "album-listen",
            title: "Listen to a whole album",
            summary: "Pick an album you've never heard, lie down, and listen from the first track to the last without doing anything else.",
            kind: .creative, minutes: 45,
            interests: [.music],
            times: [.evening, .night]
        ),
        Activity(
            id: "doodle",
            title: "Twenty-minute doodle",
            summary: "Grab paper and draw whatever comes to mind for 20 minutes without judging it. Shapes and patterns count.",
            kind: .creative, minutes: 20,
            interests: [.art],
            times: [.afternoon, .evening, .night],
            bring: ["Paper", "Pen"]
        ),
        Activity(
            id: "poem",
            title: "Write a small poem",
            summary: "Write eight lines about how today actually felt. It doesn't need to rhyme or have rules.",
            kind: .creative, minutes: 15,
            interests: [.writing, .journaling],
            times: [.evening, .night]
        ),
        Activity(
            id: "night-sky",
            title: "Look up",
            summary: "Step outside after dark and look at the sky for ten minutes. Find the moon, a star, or just the clouds.",
            kind: .nature, minutes: 10,
            interests: [.nature, .meditation],
            times: [.evening, .night]
        ),
        Activity(
            id: "stairs",
            title: "Slow stairs",
            summary: "Walk up and down a flight of stairs slowly for ten minutes, matching each step to your breath.",
            kind: .movement, minutes: 10,
            interests: [.movement],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "reading-park",
            title: "Read in the park",
            summary: "Take a book to a park bench and read for half an hour while the evening goes by.",
            kind: .nature, minutes: 30,
            interests: [.reading, .nature],
            times: [.afternoon, .evening],
            place: .park,
            bring: ["A book"]
        ),
        Activity(
            id: "volunteer-hour",
            title: "Give an hour",
            summary: "Spend an hour helping out locally: a food bank shift, a community garden, or a street cleanup.",
            kind: .community, minutes: 60,
            interests: [.community],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "sunrise-sit",
            title: "Watch the day start",
            summary: "Get outside before your phone does. Sit somewhere with a view of the sky and watch it brighten for 15 minutes.",
            kind: .nature, minutes: 15,
            interests: [.nature, .meditation],
            times: [.morning],
            place: .park
        ),
        Activity(
            id: "morning-pages",
            title: "Morning pages",
            summary: "Before you look at a screen, fill one page by hand with whatever is on your mind. Don't reread it.",
            kind: .mindful, minutes: 15,
            interests: [.journaling, .writing],
            times: [.morning],
            bring: ["Notebook", "Pen"]
        ),
        Activity(
            id: "bird-count",
            title: "Count the birds",
            summary: "Sit in a park for 20 minutes and count every bird you see or hear. Try to tell at least two kinds apart.",
            kind: .nature, minutes: 20,
            interests: [.nature, .walking],
            times: [.morning, .afternoon],
            place: .park
        ),
        Activity(
            id: "barefoot-grass",
            title: "Barefoot on the grass",
            summary: "Find a patch of grass, take your shoes off, and stand or walk slowly for ten minutes. Notice the temperature and texture.",
            kind: .nature, minutes: 10,
            interests: [.nature, .meditation, .movement],
            times: [.morning, .afternoon, .evening],
            place: .park
        ),
        Activity(
            id: "cloud-watch",
            title: "Cloud watching",
            summary: "Lie on the grass or a bench and watch the clouds for 15 minutes. Find at least one shape.",
            kind: .nature, minutes: 15,
            interests: [.nature, .meditation],
            times: [.afternoon],
            place: .park
        ),
        Activity(
            id: "new-street",
            title: "Walk a street you've never walked",
            summary: "Pick a nearby street you've never been down and walk its whole length. Look up at the buildings, not down at a screen.",
            kind: .movement, minutes: 30,
            interests: [.walking, .photography],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "water-skip",
            title: "Skip stones",
            summary: "Head to the water and try to skip a stone five times. Take as long as it takes.",
            kind: .nature, minutes: 20,
            interests: [.nature, .movement],
            times: [.afternoon, .evening],
            place: .waterfront
        ),
        Activity(
            id: "waterfront-walk",
            title: "Walk along the water",
            summary: "Walk along the shore or the river for half an hour. Match your steps to the sound of the water.",
            kind: .movement, minutes: 30,
            interests: [.walking, .nature],
            times: [.morning, .afternoon, .evening],
            place: .waterfront
        ),
        Activity(
            id: "moon-walk",
            title: "Moonlight walk",
            summary: "Take a short walk around your block after dark. Notice which windows are lit and how quiet it gets.",
            kind: .movement, minutes: 20,
            interests: [.walking, .meditation],
            times: [.night]
        ),
        Activity(
            id: "cafe-people",
            title: "Café sketchbook",
            summary: "Sit in a café and draw the cups, chairs and plants around you for 25 minutes. Leave people out if that feels odd.",
            kind: .creative, minutes: 25,
            interests: [.art, .coffeeAndTea],
            times: [.morning, .afternoon],
            place: .cafe,
            bring: ["Sketchbook", "Pen"]
        ),
        Activity(
            id: "cafe-plan",
            title: "Plan a day off, on paper",
            summary: "At a café, plan a whole screen-free day for this month: where you'd go, what you'd eat, who you'd see.",
            kind: .mindful, minutes: 30,
            interests: [.journaling, .coffeeAndTea],
            times: [.morning, .afternoon, .evening],
            place: .cafe,
            bring: ["Notebook", "Pen"]
        ),
        Activity(
            id: "library-magazine",
            title: "Read a magazine you'd never buy",
            summary: "At the library, pick a magazine on a subject you know nothing about and read one article all the way through.",
            kind: .mindful, minutes: 25,
            interests: [.reading],
            times: [.afternoon, .evening],
            place: .library
        ),
        Activity(
            id: "library-write",
            title: "Write in the library",
            summary: "Find a quiet table and write for half an hour: a story, a memory, a plan. The quiet does half the work.",
            kind: .creative, minutes: 30,
            interests: [.writing, .reading],
            times: [.afternoon, .evening],
            place: .library,
            bring: ["Notebook", "Pen"]
        ),
        Activity(
            id: "museum-sketch",
            title: "Sketch in a museum",
            summary: "Pick one sculpture or object and sketch it for 20 minutes. You'll notice details you'd never see walking past.",
            kind: .creative, minutes: 30,
            interests: [.art],
            times: [.afternoon],
            place: .museum,
            bring: ["Paper", "Pencil"]
        ),
        Activity(
            id: "museum-room",
            title: "One room, slowly",
            summary: "Choose a single room in a museum and see everything in it. Read every label. Skip the rest of the building.",
            kind: .mindful, minutes: 40,
            interests: [.art, .reading],
            times: [.afternoon, .evening],
            place: .museum
        ),
        Activity(
            id: "board-game",
            title: "Play a board game",
            summary: "Dig out a board game or a deck of cards and play one round with whoever is around. Phones stay in another room.",
            kind: .social, minutes: 45,
            interests: [.conversation, .community],
            times: [.evening, .night]
        ),
        Activity(
            id: "ask-a-question",
            title: "One real question",
            summary: "Ask someone close to you a question you've never asked, like what they wanted to be as a kid. Then just listen.",
            kind: .social, minutes: 20,
            interests: [.conversation],
            times: [.afternoon, .evening, .night]
        ),
        Activity(
            id: "coffee-invite",
            title: "Invite someone for coffee",
            summary: "Ask one person to meet you for coffee this week. When you go, keep your phone in your bag the whole time.",
            kind: .social, minutes: 30,
            interests: [.conversation, .coffeeAndTea],
            times: [.morning, .afternoon],
            place: .cafe
        ),
        Activity(
            id: "family-recipe",
            title: "Ask for a family recipe",
            summary: "Call a parent, grandparent or old friend and ask them to talk you through a dish they used to make. Write it down by hand.",
            kind: .social, minutes: 30,
            interests: [.cooking, .conversation, .writing],
            times: [.afternoon, .evening]
        ),
        Activity(
            id: "bake-share",
            title: "Bake something to share",
            summary: "Bake something simple, like cookies or banana bread, and give half to a neighbor or coworker.",
            kind: .community, minutes: 60,
            interests: [.cooking, .community],
            times: [.afternoon, .evening]
        ),
        Activity(
            id: "little-library",
            title: "Leave a book for someone",
            summary: "Pick a book you loved, write a short note inside, and leave it at a little free library or a café shelf.",
            kind: .community, minutes: 20,
            interests: [.reading, .community, .writing],
            times: [.morning, .afternoon, .evening],
            bring: ["A book you're done with"]
        ),
        Activity(
            id: "litter-walk",
            title: "Ten-piece cleanup",
            summary: "Take a bag on your walk and pick up ten pieces of litter. Your street will look a little better tomorrow.",
            kind: .community, minutes: 20,
            interests: [.community, .walking, .nature],
            times: [.morning, .afternoon, .evening],
            place: .park,
            bring: ["A bag", "Gloves"]
        ),
        Activity(
            id: "thank-you-note",
            title: "Thank someone properly",
            summary: "Write a short note to someone who helped you this year: a teacher, a coworker, a barista. Hand it over or mail it.",
            kind: .community, minutes: 15,
            interests: [.writing, .community, .conversation],
            times: [.morning, .afternoon, .evening],
            bring: ["Card or paper", "Pen"]
        ),
        Activity(
            id: "candle-sit",
            title: "Sit with a candle",
            summary: "Turn off the lights, light a candle, and watch the flame for ten minutes. When your mind drifts, come back to it.",
            kind: .mindful, minutes: 10,
            interests: [.meditation],
            times: [.evening, .night]
        ),
        Activity(
            id: "phone-sunset",
            title: "Put the phone to bed",
            summary: "Plug your phone in outside the bedroom an hour before sleep. Spend the hour on anything with paper or people.",
            kind: .mindful, minutes: 60,
            interests: [.reading, .meditation, .journaling],
            times: [.night]
        ),
        Activity(
            id: "tomorrow-list",
            title: "Tomorrow, on one card",
            summary: "Write the three things that matter tomorrow on an index card. Leave it by the door so it's the first thing you see.",
            kind: .mindful, minutes: 10,
            interests: [.journaling, .writing],
            times: [.evening, .night],
            bring: ["Card or paper", "Pen"]
        ),
        Activity(
            id: "tidy-one-drawer",
            title: "Tidy one drawer",
            summary: "Empty one drawer, wipe it out, and put back only what you use. It's small, finished, and oddly calming.",
            kind: .mindful, minutes: 15,
            interests: [.meditation],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "plant-care",
            title: "Care for a plant",
            summary: "Water, prune or repot a plant, slowly. If you don't have one, pick one up on the way home.",
            kind: .nature, minutes: 15,
            interests: [.nature],
            times: [.morning, .afternoon, .evening, .night]
        ),
        Activity(
            id: "instrument",
            title: "Play something",
            summary: "Pick up an instrument, even one you barely play, and spend 20 minutes on one song or a single scale.",
            kind: .creative, minutes: 20,
            interests: [.music],
            times: [.afternoon, .evening]
        ),
        Activity(
            id: "sing-along",
            title: "Sing three songs",
            summary: "Sing three songs out loud, in the shower or the car or the kitchen. Loud is better.",
            kind: .creative, minutes: 10,
            interests: [.music],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "collage",
            title: "Make a tiny collage",
            summary: "Cut pictures and words out of old magazines or mail and glue them into a postcard-sized collage.",
            kind: .creative, minutes: 30,
            interests: [.art],
            times: [.afternoon, .evening, .night],
            bring: ["Old magazines", "Scissors", "Glue"]
        ),
        Activity(
            id: "memory-write",
            title: "Write down one memory",
            summary: "Pick one ordinary day from your childhood and write everything you remember about it: smells, sounds, who was there.",
            kind: .creative, minutes: 20,
            interests: [.writing, .journaling],
            times: [.evening, .night],
            bring: ["Notebook", "Pen"]
        ),
        Activity(
            id: "wall-sit-push",
            title: "Five-minute strength",
            summary: "Do a slow set of squats, push-ups against a wall, and a plank. Five minutes is plenty if it's done with care.",
            kind: .movement, minutes: 10,
            interests: [.movement],
            times: [.morning, .afternoon, .evening]
        ),
        Activity(
            id: "park-jog",
            title: "Easy loop jog",
            summary: "Jog one slow loop of a park, slow enough to hold a conversation. Walk whenever you want.",
            kind: .movement, minutes: 25,
            interests: [.movement, .walking, .nature],
            times: [.morning, .afternoon, .evening],
            place: .park
        ),
    ]

    static func activity(id: String) -> Activity? {
        all.first { $0.id == id }
    }
}
