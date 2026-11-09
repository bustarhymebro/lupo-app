import Foundation

public struct TrailStep: Sendable {
    public let title: String
    public let action: String
    public let reflection: String
}

public struct GuidedTrail: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let summary: String
    public let symbol: String
    public let premium: Bool
    public let steps: [TrailStep]
    public static func find(_ id: String) -> GuidedTrail? { catalog.first { $0.id == id } }
    public static let catalog: [GuidedTrail] = [
        GuidedTrail(id: "fresh-start", title: "A softer fresh start", summary: "Seven small steps to find a routine that fits your life.", symbol: "leaf", premium: false, steps: [
            TrailStep(title: "Find your small", action: "Choose one thing that matters to you. Do the smallest version today: one page, one glass, or one minute. Small counts.", reflection: "What did you choose, and why does it matter to you?"),
            TrailStep(title: "Give it a home", action: "Do your small action just after something you already do. Pick a cue you can recognize, such as putting your mug in the sink.", reflection: "What cue felt natural?"),
            TrailStep(title: "Clear one obstacle", action: "Put what you need within reach, then do your small action. A book on your pillow or shoes by the door can make the next visit easier.", reflection: "What made starting easier?"),
            TrailStep(title: "Make a busy-day version", action: "Try a version you could manage on a busy day. Shorten the action while keeping the reason behind it.", reflection: "What is your smallest useful version?"),
            TrailStep(title: "Notice the after", action: "Repeat your small action. Pause for a moment afterward and notice what changed, even if the answer is very little.", reflection: "How did doing it compare with anticipating it?"),
            TrailStep(title: "Practice coming back", action: "Do your action today without catching up on anything missed. If you need a different cue or a smaller action, use it.", reflection: "What would help you return after a difficult day?"),
            TrailStep(title: "Keep what fits", action: "Repeat your action, then choose which days it realistically belongs in next week. Edit its schedule in Today.", reflection: "What will you keep, and what will you make easier?")
        ]),
        GuidedTrail(id: "attention", title: "Make room for focus", summary: "Fourteen practical experiments with attention, space and phone boundaries.", symbol: "timer", premium: true, steps: [
            TrailStep(title: "Choose one thing", action: "Name one task worth five quiet minutes. Spend five minutes on it, leaving the rest for later.", reflection: "What did you make room for?"),
            TrailStep(title: "Move the phone", action: "Put your phone somewhere you cannot casually reach. Spend five minutes on your chosen task.", reflection: "Where did your phone wait?"),
            TrailStep(title: "Leave a starting point", action: "Open the book, file or materials you need. Do five minutes, then leave a clear place to begin next time.", reflection: "What is your next starting point?"),
            TrailStep(title: "Catch the interruption", action: "Keep paper nearby during five minutes of focus. Write down unrelated thoughts instead of switching tasks.", reflection: "What pulled at your attention?"),
            TrailStep(title: "Use a familiar cue", action: "Start a short focus session after a familiar event, such as finishing breakfast. Keep the task small.", reflection: "Was that a useful moment to start?"),
            TrailStep(title: "Try a quieter space", action: "Change one thing in your space: clear a surface, close a door or use a quieter spot. Try five minutes there.", reflection: "Which change helped, if any?"),
            TrailStep(title: "Keep the useful experiment", action: "Repeat the experiment that helped most this week. Five minutes is enough; there is no need to increase it.", reflection: "Which condition is worth repeating?"),
            TrailStep(title: "Choose before opening", action: "Before opening a distracting app once today, name what you came for. Leave when that purpose is finished.", reflection: "Did having a purpose change the visit?"),
            TrailStep(title: "Give checking a place", action: "Choose a natural break for checking your phone. Complete a short task before that break.", reflection: "What break worked for you?"),
            TrailStep(title: "Start before polishing", action: "Make a rough first attempt for five minutes. You can edit it later; today's action is simply to begin.", reflection: "What became easier once you started?"),
            TrailStep(title: "Remove one invitation", action: "Move one distracting app off your first home screen, or close one unnecessary tab. Then try a short focus session.", reflection: "Which invitation did you remove?"),
            TrailStep(title: "Plan for interruptions", action: "Choose what you will do after an interruption: note your place, handle what matters, then return for one minute. Practice once.", reflection: "What helped you return?"),
            TrailStep(title: "Protect a useful moment", action: "Repeat a focus session at the time and place that have worked best. Keep the duration manageable.", reflection: "What combination fits your real day?"),
            TrailStep(title: "Write your focus recipe", action: "Do one final short session. Add a goal in Today using the task, cue and days you want to keep.", reflection: "What is your repeatable recipe for focus?")
        ]),
        GuidedTrail(id: "evening", title: "An easier evening", summary: "Fourteen small ways to close the day and prepare for tomorrow.", symbol: "moon.stars", premium: true, steps: [
            TrailStep(title: "Choose a closing cue", action: "Pick an event that can mark your evening, such as putting dishes away. After it, spend one minute tidying a small surface.", reflection: "What cue did you choose?"),
            TrailStep(title: "Park one loose end", action: "Write down one unfinished task and a possible next step. Leave it there for tomorrow.", reflection: "What can wait until tomorrow?"),
            TrailStep(title: "Prepare one thing", action: "Set out one thing you will need tomorrow: a bag, a book, a glass or clothes. Keep it simple.", reflection: "What will be easier in the morning?"),
            TrailStep(title: "Choose a phone home", action: "Give your phone a place to wait during a short part of the evening. Start with five minutes while you do something else.", reflection: "Where can your phone wait comfortably?"),
            TrailStep(title: "Make a quiet minute", action: "Spend one minute doing something unhurried: reading, sitting comfortably or looking outside. No result to achieve.", reflection: "What felt comfortable to you?"),
            TrailStep(title: "Name a small good thing", action: "Write one specific thing you appreciated today. An ordinary moment is enough.", reflection: "What would you like to remember?"),
            TrailStep(title: "Keep one piece", action: "Repeat the evening action that was easiest to fit into your week. Leave the rest optional.", reflection: "Which part belongs in your evening?"),
            TrailStep(title: "Close one loop", action: "Put away one item or finish one tiny task that can be completed in two minutes. Stop there.", reflection: "What feels a little more settled?"),
            TrailStep(title: "Reduce tomorrow's choices", action: "Choose your first small task for tomorrow and put its materials ready.", reflection: "What will you start with?"),
            TrailStep(title: "Make the short version", action: "Try a one-minute version of your evening routine. This is the version for busy nights.", reflection: "What can you keep when time is short?"),
            TrailStep(title: "Leave a kind note", action: "Write a practical reminder for tomorrow's you: one next step, without a list of everything unfinished.", reflection: "What would be useful to hear tomorrow?"),
            TrailStep(title: "Choose a stopping point", action: "Pick a stopping point for one optional activity tonight. When you reach it, put that activity away.", reflection: "Was the stopping point realistic?"),
            TrailStep(title: "Return without catching up", action: "Do one useful part of your evening routine. Skip anything missed on earlier days.", reflection: "What made it possible to return?"),
            TrailStep(title: "Make it yours", action: "Choose one evening action and cue to keep. Give it a realistic schedule in Today and do it once tonight.", reflection: "What will your evening routine look like?")
        ])
    ]
}

public struct TrailEntry: Codable, Equatable, Sendable {
    public let day: String
    public let note: String
}

public struct TrailProgress: Codable, Equatable, Sendable {
    public let id: String
    public let started: String
    public var entries: [TrailEntry]
    public var isComplete: Bool { entries.count >= (GuidedTrail.find(id)?.steps.count ?? Int.max) }
}
