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
    ]

    static func activity(id: String) -> Activity? {
        all.first { $0.id == id }
    }
}
