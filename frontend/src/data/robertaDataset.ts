// ---------------------------------------------------------------------------
// robertaDataset.ts
//
// HR-validated dataset built from 3 independent evaluators scoring
// 31 TSU student mock interview responses across 27 unique questions.
// All 806 answers are stored with per-evaluator scores and averages.
//
// Fields per question:
//   question          — the interview question text
//   questionAvgScore  — avg score across ALL answers for this question
//   totalAnswers      — number of answers in dataset for this question
//   breakdown         — STAR dimension weights for this question type
//   answers[]         — every scored answer, sorted by avgScore desc
//     .text           — the candidate answer text
//     .scores         — [evaluator1, evaluator2, evaluator3] raw scores (null if absent)
//     .avgScore       — decimal average across evaluators (e.g. 4.33)
// ---------------------------------------------------------------------------

export interface STARBreakdown {
  situation: number;
  task: number;
  action: number;
  result: number;
  reflection: number;
}

export interface DatasetAnswer {
  text: string;
  scores: (number | null)[];  // [ev1, ev2, ev3] — null if evaluator skipped
  avgScore: number;           // decimal average e.g. 4.33
}

export interface DatasetItem {
  question: string;
  questionAvgScore: number;
  totalAnswers: number;
  breakdown: STARBreakdown;
  answers: DatasetAnswer[];   // all answers sorted by avgScore descending
}

const robertaDataset: DatasetItem[] = [
  {
    question: `Are you a risk taker?`,
    questionAvgScore: 4.33,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 5, result: 4, reflection: 4 },
    answers: [
      {
        text: `Calculated, yes. Reckless, no. I assess before I decide. If the risk makes sense and I've thought it through, I'll take it. But I don't gamble just to seem bold.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `In personal life, not much. But professionally, I understand that some decisions require taking a calculated risk. I would always do my due diligence first — look at the numbers, look at the data — before recommending anything. I don't avoid risk entirely; I just want to understand it before I accept it.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Yes, but a calculated one. I don't just jump into things blindly. But I'm also not afraid to try something different if the current way isn't working. I think playing it too safe is also risky in a different way — you miss opportunities. So I'd say I'm in the middle, but leaning toward taking the risk when the reasoning is solid.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `In engineering, you have to be careful with risk. You calculate before you decide. But I'm not someone who refuses to make a call when one is needed. If I've assessed the situation and something needs to be done, I do it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Not in accounting, that would be irresponsible. But in terms of professional growth, yes, I take calculated risks. I will apply to positions that challenge me even if I am not yet fully confident. I just make sure I am prepared enough before taking the leap.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In teaching, trying new methods is always a bit of a risk because you don't know how students will respond. I do take those risks, pedagogical risks, I guess you'd call them. I try unconventional approaches if I believe they'll serve my students better. I'm just careful to reflect on what works and what doesn't.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes, but calculated risks. In engineering, you can't just wing things. But I'm not afraid to try something new if I've thought it through and the benefit outweighs the risk.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In clinical work, risk-taking is something you approach very carefully. I follow evidence-based practice. But in terms of career decisions, I'm open to taking chances for growth.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'd say I take thoughtful risks. I'm not reckless, but I'm not afraid to try a new approach if the old one isn't working. In teaching, you have to adapt on the spot constantly — so I'm comfortable with uncertainty to some degree.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Within reason. In hospitality, sometimes you have to make a call on the spot — like upgrading a guest's room to fix a complaint, or improvising when something goes wrong with an event. I'm comfortable making those calls if it means a better outcome for the guest.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I take informed risks. I think the hesitation to take risks usually comes from fear — and fear can be addressed with information and preparation. Once I've done my analysis and feel reasonably confident, I can act decisively. It's not recklessness, but it's also not paralysis.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes, calculated risks. I'm not reckless, that's dangerous in engineering. But I'm not afraid to try a new approach or suggest something unconventional if I think it makes sense. During our design projects, I'd often propose alternatives that weren't in the textbook, and sometimes they worked out better.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Only when it's calculated and within proper authority. I wouldn't act on my own in a high-stakes situation without clearance. But within appropriate boundaries, yes, I can make decisions under pressure.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Not particularly. I prefer to think things through before acting. But I don't think that makes me passive. I just like informed risks. I'd rather take a risk after understanding the consequences than act impulsively.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In a controlled way. I test things before deploying them, that's just basic practice. But when it comes to trying new approaches or tools, I'll try them. Innovation involves some risk. I just don't take reckless ones.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In farming, unmanaged risks can destroy a whole season's work. So I'm careful. But I'm willing to try new methods if they're backed by evidence. Like what I did with AWD on our farm. It was a risk, but an informed one. That's how I approach it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In marketing, yes. Playing it safe usually means being forgettable. I believe in testing bold ideas, though always with a plan to measure whether they work. Not reckless risks, strategic ones.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A little bit. In hospitality, sometimes you need to make quick calls without all the information you'd want. I've learned to trust my judgment while still considering the risks.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Depends. In technology, you have to try new things even if you're not sure they'll work. But I won't take risks that could break a live system without testing first.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `Yes, absolutely. Marketing is all about trying new things. You can't market the same way forever. I'm comfortable with experimentation as long as we learn from it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm cautious by nature. But in farming, weather and nature force you to make decisions under uncertainty all the time. So I've learned to take calculated risks when needed.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm open to risks, especially creative ones. Trying a new format, a different tone, or an unconventional approach to a campaign — those are risks I'm comfortable with. I believe that playing it too safe in communication makes you easy to ignore.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In clinical settings, decisions need to be careful and evidence-based. But I understand that there are moments where you have to make a judgment call quickly. I trust my training and my instincts, and I'm comfortable making decisions when needed — especially when a patient's wellbeing is at stake.`,
        scores: [4, 5, 3],
        avgScore: 4.0,
      },
      {
        text: `A little bit. In agriculture, you take risks every planting season — you invest time, money, and effort not knowing exactly what the weather or pests will do. You plan for the risks you can and accept the ones you can't. I carry that mindset to work too.`,
        scores: [4, 3, 5],
        avgScore: 4.0,
      },
      {
        text: `Not really, to be honest. I tend to follow protocol and make sure I'm sure before doing something. But I think in nursing, being careful isn't a bad thing. I do take small risks, like trying new ways to explain things to patients, but when it comes to medical procedures, I always double-check first.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `In a moderate way. I don't like jumping into things blindly, but I'm not overly cautious either. I took a risk with my small food business. I had no business background, I just tried. It worked out okay. So yes, I'm willing to take chances when I believe in something.`,
        scores: [4, 3, 5],
        avgScore: 4.0,
      },
      {
        text: `In terms of research approaches, yes. Our thesis involved going to areas that weren't the easiest to access and using methods that were more demanding. I believe good data requires effort and sometimes that means going beyond the comfortable option. But I'm not reckless, I always assess safety and feasibility first.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Not really, especially when it comes to numbers. I prefer to be careful and calculated before making any decision. But if it's necessary, I'm open to it as long as I understand the situation.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Not really. I'm more comfortable with what's proven and tested. But if I've studied a situation enough and I feel confident, I'll take a calculated risk.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Not really a risk taker by nature. I like to think through my decisions. But in teaching, sometimes you have to try different approaches with students and not all of them will work. That's a kind of risk I'm comfortable with.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Not really. I'm more on the careful side. I prefer to think things through before deciding. But I don't think that's always bad — some risks need to be calculated. I'm not the type to jump into something just because it sounds exciting. I'd rather be sure than sorry.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `Are you a team player?`,
    questionAvgScore: 4.38,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Yeah, very much so. I enjoy collaboration. I like bouncing ideas off other people and hearing their perspective. Even if I think I'm right about something, I listen to the others because sometimes you're wrong and don't realize it. I do tend to be the vocal one in a group, but I try to make sure everyone gets a chance to speak too — I'm aware of that now more than before.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Absolutely. You cannot do hospitality alone. The kitchen, the front desk, housekeeping — everyone depends on everyone else. I cover for teammates when needed, and I communicate quickly when something's going wrong so the team can adjust. I've seen what happens when people don't communicate, and it's bad for everyone, especially the guests.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Yes. I'm actually someone who reaches out and checks on teammates. In our department, I was the one who'd organize study groups or make sure no one was left behind in the preparations. I believe collaboration produces better outcomes than working in silos.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Very much. I actually thrive in team environments. I believe that good work is usually a group effort. I like supporting others and being supported. In school, I was often the one who made sure the team's morale was okay — the emotional glue, if you will.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes, absolutely. In nursing, you cannot work alone. Patient care is a team effort — from doctors to nurses to aides. I contribute my part, communicate openly, and support my colleagues whenever needed. I've learned that your teammates' wellbeing also affects patient outcomes.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes, and I think I add a different kind of value to teams — I help navigate the interpersonal dynamics. I notice tension before it becomes conflict. I help people feel heard. Teams don't just need people who deliver tasks; they also need people who help the team function well as a unit. I try to be that.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Definitely yes. I'm actually better when I work in a team. I feed off the energy of other people. I'm also the type who helps others when they're stuck.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes! Definitely. I'm actually the type who feels more energized when working with others. I love brainstorming with teammates and helping out wherever I'm needed.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes. Teaching is rarely done alone — you coordinate with colleagues, parents, and administrators. I enjoy that kind of collaboration.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Very much so. Nursing is inherently a team effort. Doctors, nurses, aides, technicians — we all have to work together. I've never had trouble collaborating.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Very much a team player. Marketing requires a lot of coordination — with designers, content people, sales teams, clients. I enjoy that collaboration.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes, very much so. Communication is inherently about connection. I've always worked well in teams — different perspectives usually produce better ideas and I genuinely enjoy that exchange.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Yes, though I prefer when roles are clearly defined in the team. I don't like ambiguity. As long as everyone knows what they're supposed to do, I work well with others. I'm not a crowd favorite because I'm not the warmest personality, but people know they can count on me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. I may be quiet, but I contribute actively in group settings. I listen carefully to what others say and I make sure my work connects properly with what the team needs. In group projects, I was often the one who made sure all the parts fit together correctly — someone had to.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. In farming and in extension work, you can't do it alone. You're working with communities, with colleagues, with government offices. You have to be able to work with all kinds of people. I'm actually more comfortable in group settings when everyone is working toward the same practical goal.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yeah, definitely. I mean, engineering is never a solo job. You need your team, from drafters to on-site workers to the client. I work well with others. Sometimes I lead, sometimes I follow. I don't have a problem adjusting my role depending on what's needed.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. I'm not the type to be loud in a group, but I contribute. I do my assigned part well, I follow the chain of command, and I don't cause conflict. In this field, teamwork and unity are important. You can't be effective alone.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. I may seem quiet, but I contribute meaningfully to a team. I am the type who does what is assigned without being asked twice. I also help others when I can, especially in reviewing work. My eye for detail has been useful to my groupmates many times.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. Farm work is almost always done as a group. You don't harvest a field alone. I work well with others, I don't cause conflict, and I pull my weight. If someone needs help, I help.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. Environmental work is collaborative by nature. You work with communities, other agencies, researchers. I'm a good team member, I do my part, I listen, and I support others. I'm not the loudest person in a group but I contribute meaningfully.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yeah. I'm actually better in teams where people have different skills. I like it when everyone brings something different to the table. I usually end up being the one who connects the technical and non-technical sides.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. In agriculture, you can't do everything alone. Planting, harvesting, managing pests — it all requires teamwork. I'm used to working in groups.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Yes. I don't always talk much in a group but I do my part and I back up my teammates. In site work, you have to rely on each other — you can't be an island. I've learned that ego on a site causes accidents.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Yes, I think so. I'm not the loud leader type, but I cooperate. In group work, I usually take on the tasks that others overlook, like preparing materials or doing the documentation. I don't mind background roles as long as the team succeeds. Though I'll admit, I sometimes find it hard to speak up when I disagree. I'm still working on being more vocal.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Absolutely, yes! I love working in teams. I'm usually the one who energizes the group when motivation is low, or the one who volunteers to bring snacks during a long meeting. I coordinate well with others and I'm very communicative, maybe too communicative sometimes, as I said earlier.`,
        scores: [4, 3, 5],
        avgScore: 4.0,
      },
      {
        text: `Yes. I'm not the loudest team member, but I'm consistent and I contribute thoughtfully. I'm usually the person who notices if someone in the group is struggling and checks in on them. I care about the team dynamic, not just the output.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Yeah. I prefer working with people over working alone, actually. It's just more interesting. I like the back and forth when solving problems with others. I just need the team to communicate clearly. If no one knows what the other person is doing, things fall apart.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Yes, though I'll be honest, I'm sometimes more comfortable leading than following. But I've learned that good ideas can come from anywhere and that listening to your team makes the output better. I've grown a lot in that area.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Yes, I think so. I'm not the loudest in the group but I always do my part. I try not to leave the burden to others and I help when someone needs assistance.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Yes, I think so. I'm not really the leader type in a group, but I do my part. I don't let my groupmates down. In school, even when the groupwork was uneven, I still made sure my assigned tasks were done. I prefer working where everyone contributes equally, but I know that's not always the case, so I just focus on what I can control.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `Yes, but I prefer working alongside people who also know what they're doing. I don't like being carried and I don't want to carry others either. I like a balanced team.`,
        scores: [4, 3, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `Do you prefer hard work or smart work?`,
    questionAvgScore: 4.6,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Smart work, always. Why work harder if you can find a better way? But I also know that smart work only becomes an option after you've already put in the hard work to understand something deeply. You can't shortcut your way to understanding — only to execution.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Smart work. I appreciate efficiency. But I know that smart work isn't possible without understanding the work first. You have to put in the time to learn before you can find shortcuts.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Both, I think. But if I had to choose, I'd say smart work — because doing things efficiently saves time and energy. But smart work only works if you've already put in the effort to learn. So I think they go together.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both have their place. But I think you need to earn smart work through hard work. You can only be efficient at something after you truly understand it. So in the beginning of any new role, I put in the hard work. Over time, I find better ways to do things.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work that comes from understanding the value of hard work. I think the best approach is when you've worked hard enough to understand something deeply, and then you find more efficient ways to do it. One doesn't replace the other.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both are necessary in this field. There's no substitute for putting in the work, but efficiency saves lives in time-sensitive situations. The smartest nurses I've observed are the ones who've put in years of hard work — and because of that, they've found the smartest ways to do things.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work, but I respect hard work. In hospitality, efficiency matters because you can't keep a guest waiting while you figure things out. But efficiency only comes after you've done the hard work of learning the systems and understanding guests' needs.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both. In engineering, lazy work can be dangerous. But working smart means checking things twice, not doing things the hard way just because that's how it's always been done. I try to find the most efficient method that doesn't sacrifice safety or quality.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both, but in my field, hard work comes first. You have to know the ground truth before you can apply the science. Smart work in agriculture is only possible when you understand the land, the crops, and the community first. That understanding comes from hard work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work. Every time. Working hard on the wrong approach just wastes energy. I always try to find the most efficient way first. That said, building the knowledge to work smart still requires hard work, so it's not like I avoid effort.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Both are required in accounting. The hard work is in understanding the principles and doing the groundwork thoroughly. The smart work is in organizing that work efficiently so nothing is missed and time is not wasted. I don't think you can choose one in this profession.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both. In agriculture, you can't escape hard work. But using the right methods, the smart part, makes the hard work actually productive. Farming the wrong way with a lot of effort still gives bad results. You need both.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I think both are necessary, but I try to lean toward smart work because in education, hard work without thoughtful design can just mean a lot of activity with little learning happening. You have to think about what you're doing and why. That said, preparing good lessons takes a lot of time and effort. There's no shortcut there.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work, always. But I also believe that smart work is built on a foundation of hard work. You have to study the market, understand the consumer, learn the tools. That groundwork is hard work. The smart part is knowing what to do with all of it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both. Research requires hard work, the long hours, the careful data collection, the tedious analysis. But smart work means designing your study well so the hard work produces useful results. You need both or your effort is wasted.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work. But smart work requires hard work to build up to. You need to do the hard work first to learn the smart ways. Once you've done the basics enough, you can find better, faster ways.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work, but I think in service it also has to be heartfelt work. You can't just go through the motions. People feel it when you genuinely care versus when you're just doing your job.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work. But you have to know the hard way first before you can find the smart way. I've learned most of my shortcuts by doing things the hard and slow way first.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work, but it takes hard work to understand how to work smart. Like, I can write efficient code now because I've made a lot of mistakes writing inefficient code first.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both, but smart work matters more in teaching. You can't be exhausted every single day and still show up for your students. Finding efficient ways to plan and manage your workload is important for sustainability.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work. In nursing, efficiency is important — you have to do things correctly AND in a timely manner. But smart work in healthcare still has to be thorough, so it's both.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work — and for marketing especially. You need to know your audience, know the platform, and work strategically. Hard work without strategy in marketing is just noise.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Both are important. In agriculture, hard work is unavoidable. But working smart — using the right techniques, timing, and methods — is what separates good farmers from great ones.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Smart work — especially in communication. The best message is not always the longest or the loudest. It's the one that reaches the right person in the right way at the right time. That requires thinking, not just effort.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I think both, but if I'm being honest, I lean more toward hard work because I'm not always the quickest thinker. I sometimes need to go through things step by step before I understand them. But I do try to find smarter ways when I can, like organizing my notes properly so I don't waste time looking for information later.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Smart work, but you need hard work to get there. You can't work smart if you don't put in the effort to understand the work first. So I do both. I work hard to understand, then I find the most efficient way to execute.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Both are necessary. In criminology, you need the knowledge, that requires hard work. But you also need to think on your feet and use what you know efficiently, that's the smart work part. You can't choose one over the other.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Smart work, because time is precious. But I don't think you can avoid hard work entirely. I try to find the most efficient way to do things, but I'll still put in the hours when needed. In public service, sometimes there's no shortcut. You just have to do the work.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Smart work, but I believe in the foundation of hard work. You have to understand the work deeply before you can do it efficiently. I spent a lot of time early on learning the theory, that's the hard work part. The smart work comes from knowing how to apply it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I think both. You need to work hard, but also in the right way. Like in accounting, if you're just working hard but not checking your figures, you'll still make mistakes. So you need to be smart about how you work.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I think framing it as one versus the other misses the point. The hardest workers I know are also smart about how they work. And the 'smartest' workers still put in serious effort. I prefer intentional work — doing things with a clear purpose and awareness.`,
        scores: [4, 5, 3],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Give an example of how you have handled a challenge in school or workplace before.`,
    questionAvgScore: 4.56,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 5 },
    answers: [
      {
        text: `One time during our thesis, our system kept crashing during testing and we couldn't figure out why. We had three days before the deadline. I stayed up for basically two nights going through everything. I even looped in one of my professors informally for advice. We eventually found the issue — it was something minor that was causing a bigger problem. We fixed it, presented, and passed. That experience taught me to stay calm and be systematic even when you're panicking.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During one of our accounting laboratory classes, we were using a system that crashed and we lost some of our work. Some of my classmates panicked, but I stayed calm and suggested we retrace our steps from the beginning using the original documents. We managed to recover most of what was lost and submitted within the deadline.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During my practicum, there was a conflict between two students that was affecting the whole class dynamic. I didn't ignore it or refer it up immediately — I talked to each of them separately first, listened, and helped them find common ground. The tension eased by the next day. I've always believed that listening is the first step to solving most problems.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During our mock events class, our venue setup was delayed because of a delivery problem. Guests — actually our professors — were arriving in 20 minutes. I quickly reorganized the team, we simplified the setup to what was already on hand, and started greeting guests personally at the entrance to manage the first impression. By the time they sat down, they didn't notice anything was off.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During our thesis, our whole group almost fell apart because one member stopped communicating. It was stressful because deadlines were coming. I ended up being the one who kept in touch with everyone, sent reminders, and redistributed some of the tasks. It wasn't perfect but we submitted on time and passed. It taught me that sometimes you just have to step up even if it's not your 'job.'`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In one group project, we had a design that wasn't going to work structurally as planned. Two of my groupmates disagreed with my assessment. I didn't argue — I just laid out the numbers and walked them through my reasoning. Eventually they saw what I saw and we revised. It's easier to convince people with data than with opinion.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our community internship, two staff members had a conflict that was affecting the whole team's morale. My supervisor asked me to mediate informally. I met with each person individually first to understand their perspectives without judgment, then facilitated a conversation between them focused on what they each needed — not on assigning blame. The tension eased significantly. It wasn't a complete resolution, but it was a step forward.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a field practicum, we were supposed to do a soil collection activity but the rain made the site inaccessible. Instead of scrapping the day, I suggested we use the time to do farmer interviews nearby — we had been planning to do those eventually anyway. We got useful data and didn't lose the whole day. You learn to adapt when the field doesn't cooperate.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our community outreach event, our main speaker cancelled two days before the event. I panicked for about an hour, then made a list of people we could contact. I called our department head, explained the situation, and we were able to get a replacement from a partner agency by the next day. The event pushed through and no one even noticed there was a last-minute change.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During OJT, I was given a set of files that were incomplete. Some receipts were missing from the expense records. I had to trace the missing documents by going through old correspondence and receipts from a physical filing cabinet. It took most of my day, but I managed to locate all but two receipts and documented the gaps properly for my supervisor.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our field practicum, the area we were assigned to had a pest outbreak. Rice bugs were affecting the crop. Our instructor gave us minimal guidance and told us to solve it. We identified the pest, researched the appropriate response, and with the materials available to us, applied an integrated pest management approach. The crop was partially saved, and we documented the process for our report.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my practicum, I had a class with very different learning levels. Some students were advanced while others were still struggling with basic comprehension. I adjusted my lessons to include differentiated activities, easier and harder versions of the same task. It took more preparation time, but I saw improvement in both groups.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For a group project, we lost one member a week before the final presentation because of a personal emergency. Instead of panicking, I redistributed the tasks, adjusted the presentation structure, and we practiced more intensely to cover the gaps. We presented well and the professor didn't even notice we were a person short.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis data collection, our sampling equipment malfunctioned in the field on one of our most critical sampling days. We couldn't postpone because of the tidal schedule. We improvised using backup manual methods, collected the data we needed, and later verified it against our other datasets. The data was usable and our study was not compromised.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our capstone, our structural design was rejected by our adviser because of a calculation error. Instead of panicking, we stayed overnight, rechecked everything, fixed the errors, and resubmitted the next morning. We passed.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a school event I was helping organize, the caterer cancelled the day before. I panicked for a minute then I immediately started calling alternative catering services. I found one, negotiated the price, and we pulled it off. Nobody at the event even knew what happened.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a group project, our main component broke two days before our defense. Everyone panicked. I just went to the workshop, assessed what we could salvage, and we rebuilt the broken part overnight. We presented the next day.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our final marketing project, our team had a disagreement about our campaign concept. Deadlines were close. I proposed a compromise — we combined the two concepts into one cohesive campaign. It was better than either original idea alone.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During one of our field activities, our assigned area was hit by heavy rains and we lost part of our trial plot. We had to replant and adjust our timeline. We divided tasks, worked longer hours, and still managed to complete our data collection.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our journalism class, I was assigned to interview a government official who was known to be difficult. I prepared thoroughly, researched the topic, and approached the interview with genuine curiosity rather than confrontation. I got more information than expected and the article came out well.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During one school event I was managing, our sponsor pulled out two days before. I kept calm, made a list of what we still had, figured out what we could cut without ruining the event, and reached out to a backup option we had discussed earlier but didn't use. The event still happened. It was simpler than planned, but it happened.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our rotation, we had a shift where two nurses called in sick and the remaining team had to cover. I volunteered to take on extra patients without being asked. I prioritized based on acuity, communicated clearly with the team, and made sure nothing fell through the cracks. It was exhausting, but we got through it.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our capstone design, our original plan had a foundation issue. The soil bearing capacity we computed didn't support the original design. We had to go back and redesign parts of the structure a week before submission. Instead of panicking, we divided the work among the group, stayed up late for three nights, and submitted on time. We even got a good grade.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our criminology licensure review, our review group had a conflict. Two members weren't cooperating with the schedule and it was affecting everyone's progress. I spoke with both of them separately, tried to understand their situations, and helped mediate. We found a schedule that worked for everyone. We all passed the reviewer exams.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our group research, two members of our team had a personal conflict that started affecting our work. I took it upon myself to talk to each of them separately, not to take sides, but to help them understand each other's perspective. We had a group conversation after that, and while it wasn't perfect, they were able to work together again.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our capstone project, our original system kept crashing when we tested it because of a logic error we couldn't find for days. I decided to start from scratch on that specific module rather than keep patching it. My groupmates were hesitant, "we'll run out of time," but the rebuild took only two days and worked cleanly. We finished the project better than expected.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our capstone project, our group leader suddenly became sick and we had to continue without her. I stepped in to organize our remaining tasks even though I was scared. It was stressful but we managed to submit on time.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During student teaching, my cooperating teacher was absent for a week and I had to take over all her classes unexpectedly. I wasn't fully prepared but I organized my lessons daily and kept everything moving. The classes went well.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our clinical rotation, I had two critical patients at the same time during a night shift. I assessed both, prioritized based on urgency, and delegated some tasks to a nursing aide. Both patients were stable by the end of the shift.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During a freelance project, the client kept changing requirements after I'd already coded half of it. Instead of starting over, I refactored my code to be flexible enough to handle the changes. It cost me extra time but I delivered on schedule.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `During our community health duty, our group was assigned to a barangay that was really far and had no stable internet connection. We needed to submit our reports online, but signal was always poor. What we did was save our work offline during the day and look for a spot with better signal in the evening just to upload everything. It was tiring, but we managed to submit on time.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `Give an example of when you performed well under pressure.`,
    questionAvgScore: 4.54,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 5 },
    answers: [
      {
        text: `Our finals presentation in one of our major subjects. Our original idea got scrapped by the professor two days before because it was 'too similar' to a previous group's. We had to pivot completely. I led the brainstorming that night, we divided the work, and we built a new presentation from scratch. It wasn't our best work ever, but we got a passing grade and more importantly we didn't fall apart under the pressure.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `At the hotel during OJT, a group check-in went wrong — the rooms weren't ready on time and the guests were tired and frustrated. I handled the front desk interaction, apologized sincerely, offered complimentary drinks while they waited, and arranged the room to be ready within 15 minutes. The group left a good review specifically about how the situation was handled. That was a proud moment.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During our capstone defense, one of our group members got sick the night before and couldn't present her part. I found out late at night and I had to review her portion and present it the next day on top of mine. I was really scared, but I reviewed everything and it went okay. The panel didn't even notice there was a last-minute change.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Our comprehensive exam in fourth year covered everything from first year to fourth year. It was a lot. I made a study schedule weeks in advance and stuck to it. When exam day came, I was nervous but I had prepared, so I focused and got through it. I passed. It felt like the reward for all those weeks of discipline.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A patient in our rotation showed sudden signs of distress during my shift. I immediately assessed the situation, called for help, began monitoring vitals, and stayed with the patient while we waited for the resident. I was shaking on the inside, but I didn't show it. I kept talking to the patient calmly. Later, the nurse said I handled it well for a student.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis defense, a panel member challenged one of our foundational assumptions in a way I hadn't anticipated. Instead of panicking, I took a moment, acknowledged the point, and gave a measured response using supporting material from our literature review. Afterward, my adviser told me she was impressed with how I handled it. I think staying calm under intellectual pressure is something I've developed over time.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis defense, one of our data sets was questioned by a panel member. I hadn't expected that specific challenge, but I was very familiar with our fieldwork and I explained where the data came from and how we collected it in detail. The panel was satisfied. I think knowing your data really well — not just the numbers but the actual experience behind them — is what saved me.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For our senior thesis defense, our entire PowerPoint crashed the morning of our defense. We had to rebuild it from scratch in three hours using a backup copy with missing elements. I led the rebuild. I assigned specific slides to each member and we pulled it together just in time. We passed with a high grade.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During the final week of our accounting major exams, we had three major exams in five days. I created a study schedule covering all three subjects and stuck to it strictly. I passed all three. The key was not panicking and trusting the system I had set up for myself.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis data collection, heavy rain damaged some of our plot markers and mixed up some of our samples. We had a submission deadline coming. I stayed an extra day in the field to re-mark and reorganize the plots properly. It was physically exhausting, but we got clean data and submitted on time.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my demonstration teaching, which is evaluated by my cooperating teacher and my TSU supervisor, I had a lesson plan that I had prepared thoroughly, but five minutes in, the projector stopped working. I shifted to a board-based discussion on the spot, used the class time well, and finished the lesson smoothly. My supervisor gave me high marks specifically for handling the unexpected.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a marketing competition in school, we were given a case and had to present our campaign strategy in less than two hours. I led the concept development, divided the work, and we pulled together a cohesive pitch. We placed second out of eight groups. Given the time constraint, that felt like a win.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis defense, one of our panelists challenged the validity of our sampling method quite sharply. I was nervous but I had studied our methodology thoroughly. I explained our rationale clearly, acknowledged the limitation they raised, and showed how we had accounted for it in our analysis. My adviser told me afterward that I handled it well.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our finals week, I also had to man the information booth for our department's open house. It overlapped with my exam schedule. I planned my time very carefully, studied in between shifts, and managed to pass all my exams while still doing a good job at the booth.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our machine shop finals, three tasks had to be done in one afternoon. I prioritized by difficulty and time required, completed them in order, and finished with a few minutes to spare.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In one of our major subjects, the professor gave us a project with a very short timeline. I mapped out all the tasks, divided them clearly in our group, and we worked in short focused sessions. We submitted on time with a complete output.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our nursing board exam review, I also had to help care for a sick family member at home. I managed a schedule where I studied in the mornings, cared for my family member in the afternoon, and reviewed again at night. I passed the boards.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During an organizational event I helped lead, one of our sponsors backed out last minute. I had to pitch to two new sponsors in one day. It was nerve-wracking but I managed to secure one of them and we pushed through with the event.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a school publication deadline, we lost two writers the same week. I had to write three articles in two days while also coordinating the layout team. I structured my time carefully, focused on one article at a time, and submitted everything on deadline.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our final demo day, our system crashed in front of the panelists. Instead of freezing, I said, "Give me two minutes," opened the code, identified the bug live, and fixed it. The panelists actually commented that it showed real-world troubleshooting skills. That one's kind of a highlight.`,
        scores: [null, 4, 5],
        avgScore: 4.5,
      },
      {
        text: `Finals week of my third year — I had three major requirements due within four days. I mapped out each task, worked on them in blocks, and slept only when necessary. All three were submitted on time. Not my best work ever, but they were solid enough. Pressure made me prioritize better.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `At a school program where I was in charge of the literary segment, our sound system failed just before the event. I had to quickly reorganize the program, adjust cues, and re-brief the participants. It was stressful, but I kept calm in front of the students because I knew they were watching my reaction. The program went well.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our capstone presentation, one of our group members got sick hours before. I had to take over her portion with maybe two hours of prep. I went through her notes fast, kept the explanation simple, and presented it. It wasn't perfect but it was accurate and the panel didn't give us problems on that section.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Our OJT final presentation. We had to present our field observations and recommendations to actual engineers from the company. My group had some issues with our data earlier that day, and I had to quickly reorganize our presentation and fill in some gaps from memory. It went well. The engineers were satisfied with our output.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During a mock crime scene analysis in school, we were given a scenario and only 30 minutes to document and analyze everything. I stayed calm, moved systematically, and presented my findings clearly. My professor said my analysis was one of the most organized in the class.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our thesis oral defense, one of our panel members challenged our methodology quite aggressively. I was nervous, but I took a breath and answered calmly, acknowledging the limitations but explaining our rationale. My voice was steady even though my hands were shaking under the table. My adviser told me afterward she was impressed by how I handled it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During finals week, I had to prepare for the board exam review while also finishing my thesis. I made a schedule and stuck to it. I didn't sleep much but I managed to pass everything.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our final defense for our thesis, one of our group members got sick the day before. I had to study and memorize her part of the presentation overnight. The panel asked me tough questions and I answered them all. Not perfectly but I didn't freeze.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During my final demonstration lesson — which is a big part of our course — I had a difficult class group that wasn't very responsive. I adjusted my approach mid-lesson and found activities that got them involved. I passed the demo.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our skills lab final exam, the instructor gave us a patient scenario on the spot. We had to assess, plan, and perform the procedure in real time. I was nervous, but I focused on what I knew. I went through each step carefully, didn't rush, and I passed. My instructor said I stayed composed even though she could tell I was anxious. That was a good moment for me.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `During one semester, I was managing our trial plot while also studying for midterm exams. I made a weekly schedule and woke up earlier to complete my field work before classes. I passed both obligations.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Give an example of when you showed leadership qualities.`,
    questionAvgScore: 4.53,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 4 },
    answers: [
      {
        text: `I was appointed project manager for one of our bigger school requirements. There were disagreements in the group early on — people had very different ideas and some weren't contributing. I had to mediate, set a clear direction, and hold people accountable. It wasn't fun at first, but by the end we had a solid output. I learned that leadership isn't about being in charge — it's about making the work happen.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During an organization event where the assigned leader was unable to attend due to a family emergency, I stepped in. I had been involved in the planning, so I knew what was needed. I briefed the team, delegated clearly, and kept everyone calm. The event pushed through without the attendees knowing anything was different behind the scenes.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `As our rotation group leader for one clinical placement, I made sure everyone had their patient assignments, that pre-conferences started on time, and that no one was overwhelmed or left without support. When one of my groupmates was struggling emotionally with a terminal patient, I checked in on her privately and made sure she was okay. Leadership, to me, is also making sure the people around you are alright.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our capstone event in school, I was assigned as event coordinator. One of my team members got anxious and froze during setup. I quietly reassigned some of their tasks to others without drawing attention to it, then stayed near that person to support them. The event ran on time and that person thanked me afterward. Sometimes leadership is just protecting your team's confidence.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a group project where our dynamics were chaotic — different personalities clashing — I stepped in not as the formal leader but as a mediator. I helped the group articulate what each person's concern was and what we all had in common as a goal. Once people felt heard, the collaboration became much smoother. I think sometimes leadership is just making it safe for people to work together.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our field practicum, a classmate didn't know how to properly take soil samples and was getting frustrated. I volunteered to demonstrate step by step and then let them try while I watched. Nobody asked me to do it — I just saw the need. The instructor noticed and mentioned it during our evaluation.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I was president of our department student council in third year. We organized a full department week with five days of events and limited budget. I delegated tasks, communicated with faculty, managed the sponsors, and made sure every event pushed through. It was exhausting but it was one of the best weeks our department had, according to our faculty adviser.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a group project in Taxation, I took the lead in reviewing everyone's outputs before submission. I coordinated the final compilation, identified inconsistencies between sections, and made sure the format was uniform. The professor complimented our submission as one of the most organized in the class.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our community extension activity, I was the one who coordinated with the barangay farmer group and organized the demonstration on composting. I spoke to the farmers directly, not in a formal way, but just talked to them the way I talk to my dad. They responded well, and several asked follow-up questions and said they'd try it. My professor said I connected with the community better than most of my classmates.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I was elected as the practicum representative for our batch. I coordinated between our cooperating schools and our university supervisor when issues came up. When one of our batchmates had a conflict with her assigned school, I helped mediate and find a solution without escalating unnecessarily. Everyone finished their practicum without major problems.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I was the creative director of our college publication for one semester. I managed a team of writers and designers, set editorial direction, and made sure we met our print deadlines. It was chaotic sometimes, but we produced three issues that semester, which was more than the previous semester's output.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I wasn't the official head of our thesis group, but I became the one who coordinated our field schedules, managed the equipment, and made sure our data collection was on track. When the group needed direction in the field, I stepped up. Not because I wanted the title, but because someone had to keep things organized.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In a community outreach project, I volunteered to lead the logistics team. We had to manage 50 people, supplies, and scheduling. It was chaotic but I kept everyone on track and we finished the activity on time.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our college event, I was assigned as logistics head. The original plan had some gaps and I stepped in to redistribute tasks and set clearer timelines for everyone. The event went smoothly and our professor complimented our team's execution.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I wasn't officially the leader of our capstone team but I ended up guiding the technical direction because the others weren't sure how to proceed. I just explained things clearly and we moved forward together.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a practicum, I volunteered to head the committee for a school program. I coordinated different groups, reminded everyone of deadlines, and made sure the event ran smoothly even when some people weren't cooperating.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During one rotation, our team leader was absent. I took the initiative to distribute the patient assignments and brief the team on priority cases. It wasn't asked of me but I did it to keep things running.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `As events head for our marketing organization, I had to manage a team of 15 people for a major school fair. I delegated tasks based on strengths and kept morale up throughout the planning process. The event was a success.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `As editor-in-chief of our school publication for one semester, I had to guide writers with different levels of experience and manage the editorial direction. I held weekly check-ins, gave individual feedback, and made sure everyone felt heard. It was demanding but the publication improved under my tenure.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It was during a school project where our elected leader was absent for most of the preparation. Nobody really took charge so I started making the task list and assigning things. I didn't announce myself as leader or anything — I just started doing it and people followed. We got the project done. I guess quiet leadership is still leadership.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I was the head of the marketing committee for a school fair. Two of my members weren't doing their tasks. Instead of complaining, I reassigned their tasks to those who were willing and pulled up the ones who were slacking for a short but honest conversation. By the end, we had everything done. I don't like confrontation but sometimes it's necessary.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `During a school project, the group was struggling to divide tasks fairly. I stepped in not as the assigned leader but just as someone who saw the problem. I suggested a task assignment based on each member's strength and everyone agreed. From then on, the group worked more smoothly. Leadership, for me, is about solving problems, not claiming authority.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During a school site visit, one of my classmates didn't know how to use the surveying equipment and was falling behind. I quietly walked over and helped them without calling attention to it. When the output was submitted, it was complete. Nobody had to fail because of a skill gap. I think that's what a team is for.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm not naturally a leader, but during one of our group rotations, our assigned leader got sick and couldn't come. Someone had to take over, and no one was volunteering, so I stepped up. I divided the tasks, made sure everyone knew what to do, and checked in with each person throughout the shift. It wasn't perfect, but we got through the day and no task was left undone.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In our capstone group, I wasn't the official leader, but during a phase when our actual leader was overwhelmed, I started organizing things, scheduling meetings, following up on each person's tasks, making sure we were on track. The group appreciated it and our output improved.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I was the head of our thesis group. My role was to make sure everyone was on track and that we followed our timeline. I wasn't the loudest leader, but I was consistent. I sent reminders, checked on members, and made sure our work was up to standard. We finished on time and defended successfully.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I was the program head for our department's mental health awareness week. I coordinated with four committees, managed timelines, and made sure everyone had what they needed to do their roles. I led quietly. I didn't micromanage, but I made sure no one was lost. The event ran smoothly and our faculty adviser called it the best-organized event our department had done.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I wasn't the official leader of our capstone group, but I became the go-to person for technical decisions. I laid out the project architecture, delegated tasks based on everyone's strengths, and resolved disputes about direction when they came up. Leadership doesn't always come with a title. Sometimes you just step up because someone has to.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During a community visit for our extension class, the group didn't have a clear plan and people were standing around. I took initiative and suggested we divide into teams with specific tasks. It brought order to the visit.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I was once the secretary of our organization and I also acted as president for one event when our president was absent. I was nervous but I just made sure everything was planned and the members knew what to do.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm not a natural leader but during one group project, nobody stepped up. So I just took over assigning tasks based on who was best at what. I didn't give a speech or anything, I just told everyone what to do and we moved.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Give examples of ideas you've had or implemented.`,
    questionAvgScore: 4.57,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 4 },
    answers: [
      {
        text: `In school, during our capstone project, I suggested that we simplify our system's interface because our original design was too complicated for the users we were targeting. My groupmates agreed after I explained it, and our professor actually praised that decision during our final defense. It wasn't a big idea, but it helped us get a better output.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `In one of our school organizations, we didn't have a clear recording system for dues and expenses. I suggested a simple ledger format and volunteered to maintain it. It wasn't revolutionary, but it solved a problem that had been causing confusion for the organization for a while. By the end of the year, the finance committee knew exactly where every peso went.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During student teaching, I noticed that the class got restless after 30 minutes of straight lecture. I started incorporating small group discussions and pair activities to break the pattern. Class participation increased noticeably. My cooperating teacher adopted some of those techniques herself, which was really nice to see.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `In one of our school projects, my group was doing it the long way because that's how it was always done. I suggested a different approach that would cut the time in half. There was pushback at first because people were comfortable with the old way. But I explained the logic, we tried it, and it worked out. We had more time to refine our output instead of just rushing to finish. I like when logic wins.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In school, we had a student organization that was having trouble with event budgets. I proposed a simple tracking sheet and weekly budget review before any purchase. It sounded basic but nobody was doing it before. We ended up saving money and actually had a leftover fund by the end of the sem.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In our clinical rotation, I noticed that nurses were spending a lot of time repeating information to each family member who came to ask about a patient's condition. I suggested to our head nurse that a brief daily family update — at a set time — would streamline things. She thought it was a good idea and they piloted it during our remaining rotation. It seemed to help.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During a school-organized mock hotel experience, I suggested we add a small personalized welcome card for each 'guest' (our professors who were role-playing as guests). We printed them the night before. It was a small detail but our guests genuinely appreciated it and mentioned it in their evaluation. That little idea improved our score.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In our capstone design project, the original plan for materials was going over budget. I suggested alternative materials that met the technical requirements but cost less, and I backed it up with the specs. The panel accepted the revision. It wasn't complicated — I just looked at the problem practically.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In one of our school organizations, team meetings were always long and often unproductive because people talked but nothing got decided. I suggested that each meeting begin with three specific questions to answer by the end. It sounds simple, but it gave the meetings structure and purpose. The organization adopted it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In one of our school projects, we were studying integrated pest management. My group was going the conventional way, but I suggested we add a section on locally available natural pesticides because farmers in our province actually use them. Our professor liked the practical addition and we got good feedback on the output.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For our department's bulletin board, no one really updated it. It was full of old posters and announcements from two semesters ago. I volunteered to redesign it and make it a weekly updated space. I made a template and assigned a rotating person to update it. By the end of the semester, it was one of the most visited spots in our hall because people actually got useful information from it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `On our family farm, I suggested we try a simple water management schedule instead of flooding the field all the time. It's a technique I learned in school called alternate wetting and drying. We tried it and we saved on water and still got a decent yield. My dad was skeptical at first, but when it worked, he was convinced.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During student teaching, I introduced a "Story of the Week" segment in my class where we'd read and discuss a short English text together, just 10 minutes at the start of class. It was a way to build reading habits informally. My cooperating teacher liked it and continued it after I left.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For our department's fundraising event, I suggested we use social media more aggressively instead of just posters. I designed simple graphics and wrote captions that were more engaging. Our event had significantly higher attendance than previous years. Our adviser said it was the best-promoted department event she'd seen.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In our campus, I noticed that the waste segregation bins were placed in inconvenient spots and most students just ignored them. I coordinated with our department and suggested repositioning them near high-traffic areas and adding clearer labels with pictures. After the change, compliance improved noticeably. Small fix, real impact.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our practicum, I suggested adding a small welcome note on guest room doors with local food recommendations. My supervisor liked it and we did a trial run. Guests responded very positively to it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `At our OJT, I noticed workers were doing manual checks on machines every hour which was time-consuming. I suggested setting up a simple checklist system that would cut checking time in half. They tried it and it worked okay.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our duty rotation, I suggested that our team create a simple handover checklist so outgoing and incoming nurses wouldn't miss anything during shift transitions. Our clinical instructor approved it and we used it for the rest of our rotation.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our marketing class, I proposed a guerrilla marketing concept for a local product as a case study. My professor said it was one of the most original ideas in the class. I also suggested to our organization that we create Instagram reels to promote our events, and our reach doubled.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I suggested to our barangay's farmers' group — through our practicum — a simple crop rotation schedule to prevent soil depletion. It wasn't complicated but it was something they hadn't been doing consistently. They tried it and saw improvement.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our capstone, I proposed that we structure our documentation report as a narrative rather than the typical format. The faculty approved it and said it was one of the most readable reports they'd reviewed. I also suggested that our organization do a social media content calendar — something they hadn't been doing consistently — and it helped them post more regularly.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In our department, we noticed that patients' family members were always confused about visiting hours because the signs were old and hard to read. I suggested to our head nurse that we make a simple updated poster with bigger fonts and clearer information. She approved it and I made it during my break time. It was a small thing, but the families appreciated it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our on-the-job training, I noticed that the workers were having a hard time reading the layout plan because it was printed too small and the paper kept getting wet in the field. I suggested we laminate a bigger printed version and attach it to a board on-site. Simple idea, but the foreman said it actually helped them avoid errors. Small win, but I was happy about it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `At our student organization, I suggested creating a simple emergency contact board for our department, listing numbers for security, the clinic, and local emergency services. It sounds minor, but there was actually a time someone fainted and no one knew who to call first. After that, everyone appreciated having it posted.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During our OJT, the company was using a manual attendance logbook. I suggested they use a simple Google Form linked to a spreadsheet instead. It wasn't anything impressive, but it automated the computation of attendance and reduced errors. My supervisor approved it and they kept using it after my OJT ended.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During OJT, I noticed that the petty cash liquidation reports were being done inconsistently by different staff members. I created a simple standardized template and shared it with the team. My supervisor adopted it as the standard format going forward, which reduced back-and-forth corrections.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our practicum, I noticed that the team was spending too much time going back and forth on site updates. I suggested using a group chat dedicated only to site updates and photos. Simple thing, but it made coordination much faster.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `For a school project, I suggested we use version control so that everyone's code changes didn't overwrite each other. Some group members didn't know what it was but I explained it simply and we used it for the whole project. It helped a lot.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During student teaching, I created visual vocabulary cards for difficult words in our lessons. Students responded well to it and my cooperating teacher adopted the approach even after my deployment ended.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In our psychology club, I suggested we start a "Kumustahan Corner," a small space in the department hallway where students could write how they were feeling on sticky notes anonymously. It became surprisingly popular. Some students even wrote about serious things, which led our club to create a referral guide for students who needed professional support.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `During our team project in school, I suggested that we use a shared spreadsheet so we can all track our progress. It wasn't a big idea but it helped our group stay organized. My groupmates liked it and we finished on time.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `How do you deal with pressure or stressful situations?`,
    questionAvgScore: 4.26,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 5, result: 4, reflection: 5 },
    answers: [
      {
        text: `I actually kind of thrive under pressure, honestly. I focus better when there's a deadline. I make a quick mental list of priorities and just start attacking them one by one. I do get stressed, don't get me wrong, but I deal with it by moving, not freezing. And I talk about it sometimes with friends just to vent — it helps.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I get quiet, I make a list, and I start. Overthinking doesn't help, so I just act. If I'm overwhelmed, I break the problem into smaller pieces and solve one at a time. I don't talk much about my stress — I just work through it.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I write. Seriously — journaling helps me sort through what I'm feeling so I can think clearly. I also talk to someone I trust when things get heavy. And I try to remember that most stressful situations are temporary. That perspective helps.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I breathe, I assess, and I act step by step. Panic is contagious, so I try to be the calm one. After the situation is resolved, I process it — talk about it with a trusted colleague or write it down. That debrief is important so it doesn't accumulate.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I focus on what I can control. If it's a busy night and there's a complaint, I take a breath, deal with the immediate concern, and then figure out the bigger picture after. I try not to take stress personally — it's just part of the job.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I channel it into action. When things are stressful, I write down everything on my plate, cross out what's not urgent, and focus on what needs to be done first. I also take a short walk to reset my head.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I breathe first. Then I organize. When I feel overwhelmed, I write down everything that needs to be done and start with the most urgent. I find that structure calms me. I also pray, honestly — it helps me center myself when things feel out of control.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I name the stress first — I literally acknowledge it internally. Then I separate what I can control from what I can't, and I focus only on the former. I've learned that most pressure feels bigger than it is before you break it down. After that, I move through it systematically.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I channel it into action. Stress makes me focus, weirdly. Like, the closer the deadline, the more productive I get. I do get irritable when things pile up, I won't lie, my groupmates will confirm that. But I don't freeze. I just push through and deal with the emotional part after the work is done.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I stay quiet, assess the situation, and prioritize. I don't talk much when I'm under pressure, I focus. If I feel overwhelmed, I take a moment to collect my thoughts before acting. I've learned that reacting too fast in this field can cause more problems.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I journal. Seriously. It helps me organize my thoughts when everything feels scattered. I also take walks when I feel overwhelmed. And sometimes I just need to sit with the discomfort for a bit before I can think clearly. Fighting it too hard sometimes makes it worse.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I isolate the problem. Literally. I try to figure out what's actually causing the stress and deal with that specific thing instead of worrying about everything at once. And I drink a lot of coffee. That's probably not the healthy answer, but it's the honest one.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I make a list of tasks prioritized by urgency and deadlines. Then I work through them one at a time. I don't allow myself to feel overwhelmed all at once. I also make sure I eat properly and rest, because I've learned that mental errors increase when I'm exhausted.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I write. Journaling helps me process things. I also talk to people I trust, a classmate, my mentor, or my youth group co-coordinator. And I pray. I've found that when I'm overwhelmed, the best thing I can do is step back for a moment, reorient myself on what matters, and then keep going.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I make a list and I start crossing things off. Action helps me more than thinking. When I'm overwhelmed, being productive actually calms me down. I also talk to people I trust, either friends or family, just to get out of my own head.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I go outside if I can. Even just a short walk helps me reset. I also organize my thoughts by writing them down. And I remind myself that slow progress is still progress. In environmental work, things don't change overnight. That perspective helps me stay patient even when things are hard.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I just focus on what I can control. When things get hectic, I list down priorities and knock them out one by one. I also make sure to breathe and not spiral. Panicking just wastes time.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I breathe, smile, and keep moving. Seriously though, I've learned that in this industry, staying calm and smiling even when things are falling apart is important. I try not to show the stress to guests or clients. I deal with it internally and fix the problem as fast as I can.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I usually step back and think before reacting. If it's a technical problem, I try to isolate what's causing it. If it's a people problem, I try to communicate calmly. I don't like unnecessary tension.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `I take a moment to breathe and remind myself to focus on what I can control. Then I prioritize. If it's a classroom situation, I stay calm because students absorb whatever emotion the teacher is showing.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I stay grounded. When things go wrong — bad harvest, pest outbreak, weather damage — you can't just give up. You assess the damage, figure out what can be saved, and move forward.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I process before responding. I've learned not to react immediately when things go sideways. I take a moment, assess what I can control, communicate clearly with whoever is involved, and then move. Staying calm helps me think clearly.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I usually get quiet when I'm stressed. I kind of go into 'focus mode.' I make a list of what needs to get done and just start from the most important one. Sometimes I also take a short break — like drink water or step outside for a few minutes — just to clear my head. I don't talk about it much, but I manage.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `When I feel overwhelmed, I take a short breath and try to list down what needs to be done first. I also pray, that helps me calm down. During our board exam review, there were days when I just broke down crying because it felt like too much. But I'd call my mom, she'd remind me why I started, and then I'd get back to studying. Talking to someone helps me a lot.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I talk about it! I call a friend or my lola, vent a little, then refocus. I also make a list of what needs to be done so I don't feel like everything is falling apart at once. Breaking it down helps me a lot. And honestly, I tend to work better when there's a deadline approaching. The pressure kind of wakes me up.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I keep working. I know that sounds simple, but when I'm stressed, the best thing for me is to stay busy and focused on what I can control. If I'm overwhelmed, I talk to someone, my dad, or a friend. I don't keep things inside too long.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I breathe and focus on the patient. That grounds me. When everything feels overwhelming, I remind myself why I'm there and what needs to be done right now, one thing at a time.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I focus. I stop overthinking and just start solving the problem. Stress doesn't help, so I don't let it take up too much space in my head. I've had all-nighters during school — you just power through.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I go back to basics. What's the actual problem? What do I have to work with? What do I do first? I don't spend much time panicking. In farming, if you panic, you miss the window. You just act.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `When I'm stressed, I usually breathe first and make a list of what needs to be done. I try to work one task at a time so I don't feel overwhelmed. Sometimes I also pray. It helps me calm down.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I just focus. I know that's simple but it's true. When things are stressful I block everything else out and deal with the main problem. I don't overthink it.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `How do you feel about working weekends or late hours?`,
    questionAvgScore: 4.4,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 5, result: 4, reflection: 5 },
    answers: [
      {
        text: `It's fine with me, honestly. I'm young, I have the energy for it. I've done all-nighters in college — I know how to push through. As long as it's not a constant thing every single week, I can handle it. I think it comes with the territory, especially early in your career.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `That's just the nature of hospitality, and I accepted it when I chose this path. Weekends are peak time. I'm fine with it. What matters to me is that the team is solid and the management is fair with scheduling.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `I understand that there are busy seasons in accounting work — like tax season or audit periods — where extra hours are expected. I'm prepared for that. I don't mind working beyond regular hours when needed, as long as it serves a purpose. I just ask for balance in the normal seasons.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm okay with it when it's needed. I've done weekend coaching sessions and stayed late for school events during my practicum. It's tiring but it's part of the job. What matters is that it's purposeful — I can deal with hard work when I understand why it's needed.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It's expected in nursing and I've accepted that. Rotating shifts are part of the profession. As long as rest days are respected and the workload is reasonable, I have no issues. I plan my personal life around the schedule.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It's fine. Construction and engineering projects don't follow a nine-to-five schedule. I knew that going in. As long as it's fair and compensated, no complaints.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It's normal to me. Farming doesn't take weekends off. If there's harvest, there's harvest — you work. I don't have a problem with it as long as the work is fair and the purpose is clear.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I understand that during peak periods, like tax season or closing periods, extended hours are expected. It's part of the profession. I have already experienced that during our OJT and I managed it fine. I prepare for it and make sure my health and schedule can accommodate it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `No issue. In farming, there's no weekend when the crop needs you. I grew up working Sundays. I understand that field-based work doesn't follow a regular calendar, especially during planting or harvest season. I'm used to that rhythm.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Teaching often extends beyond classroom hours, checking papers, preparing lessons, attending events. I've done that during practicum and I don't mind. I just try to manage my time so that the extra hours are productive and don't burn me out. Sustainable effort matters. I want to be in this for the long run.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Field work doesn't always happen on weekdays, so I understand that. If we're collecting samples or conducting surveys, the schedule follows the environment, not the calendar. I'm okay with that. I'd rather be in the field on a weekend than stuck in an office all week.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It's fine. Especially in IT, work doesn't always follow an 8-to-5 schedule. If a system goes down at night, it needs to be fixed at night. I get that.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Fine! Especially during campaigns or launches, I expect things to get hectic. I thrive in that kind of situation honestly. As long as there's a reason and it's not always like that.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It depends on the frequency. Occasionally, yes, I can do it. Every weekend — that's a conversation about compensation and workload balance. I'm not against hard work, but I also believe in sustainable work. Burnout doesn't help anyone.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I can manage it, but I'm also someone who values balance deeply — because I understand the psychological cost of burnout. I'll do what the role requires, but I'd also advocate for healthy practices in whatever team I'm in. Not as a complaint, but as a genuine concern for everyone's performance and wellbeing.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Fine with it. Construction doesn't follow a Monday-to-Friday schedule, I know that. I've pulled all-nighters during thesis season, I've been on-site in the heat, I've dealt with tight deadlines. I'm used to it. As long as the work is meaningful, I don't mind.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `It's expected in this field. I have no issue with it. I grew up watching my father do 24-hour duty at the barangay. I understand that public safety doesn't have regular hours, and I'm prepared for that.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `If there's a campaign launching or a deadline, I'm in. I actually tend to be most creative at night, weirdly. I'm not going to complain about overtime when the work is exciting. I just need to know the extra hours have a purpose and aren't just being wasted.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `Sure, as long as the reason makes sense. Deadlines are deadlines. I've been working on construction-related internships and late hours are normal there. It's part of the job.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `I'm okay with it. In hospitality, working weekends and late hours is really expected. I've done it during my OJT and I've gotten used to it. I just make sure I still get to rest when I can.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `Fine with me. In maintenance work, machines don't break on schedule. If something needs to be fixed on a weekend or late at night, that's just how it is.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm okay with it as needed. I understand that teaching involves a lot of work outside the classroom — checking papers, preparing lessons, attending meetings. That's already part of the job description.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `I understand that it's part of the job. In nursing, health doesn't stop on weekends or at 5pm. As long as it's fair and not exploitative, I'm willing.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `I'm fine with it when necessary. Especially in communications and media, there are moments like events, launches, or coverage that require extended hours. I understand that and I don't mind as long as it's purposeful.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `It's okay, as long as it's not every single weekend. I understand that sometimes work demands that, and I'm willing to adjust. I just need to manage my energy well so I don't burn out. I've done a lot of late nights during school so it's something I'm used to, I think.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `I understand that nursing doesn't follow a regular 8-to-5 schedule, so I'm okay with it. It's part of the work. But honestly, adjusting to night shifts was hard for me at first. I'd feel dizzy and my eating schedule got messed up. I've been learning how to manage it better, though. I make sure I sleep before my shift and I bring food.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Honestly, it depends on the reason. If there's a real deadline or an urgent issue, yeah, no problem. But if it's just a culture of staying late to look productive, that's not something I vibe with. I think efficient work during regular hours is better than long inefficient hours. But I'm not unreasonable. I understand that in IT, things break at 11 PM sometimes.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `It's okay. I understand that sometimes work requires extra time, especially during deadlines. I just hope it won't be every single week, but I'm willing to do it when needed.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Okay lang po. Farming doesn't have days off really. I grew up helping on our farm on weekends and holidays. That's just how it is.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Honestly, it's fine! I mean, I won't lie, I love my weekends. But when work calls for it, I don't complain. During our community programs, we worked weekends a lot. I just make sure I have enough energy. I drink my vitamins, I stay hydrated. You know, the basics.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I can do it, though I'll be honest. I function better with regular hours because my energy depletes faster than others, being introverted. But I understand work sometimes requires flexibility. I just make sure I have some recovery time when possible. It's something I'm managing.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `How do you want to improve yourself in the next year?`,
    questionAvgScore: 4.22,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `I want to develop my data analysis skills. I'm strong on the creative side, but I want to be able to back my ideas with numbers and insights, not just gut feel. Marketing is more credible when you can measure what you're doing.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to get better at technical documentation. I know it's a weakness and I plan to just practice it — write down what I do, how I do it, why. It's a discipline I need to build.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to improve my confidence in making independent clinical assessments. I also want to enhance my skills in a specific area, maybe critical care or emergency nursing.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to be better at speaking up in meetings. I often have opinions and observations but I hold back. I want to learn to share them more confidently. I also want to continue studying for the board exam alongside work.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on my confidence in asserting clinical concerns to senior staff. Sometimes I hesitate because of the hierarchy. I need to be better at speaking up, because patient safety depends on it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on my formal writing and documentation skills. In hospitality, reports and incident documentation matter and I know I'm better at speaking than writing. I want to close that gap.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My communication and presentation skills. I know my technical stuff is solid, but conveying it clearly to non-technical people — clients, management — that's something I need to work on. Also, I want to read more about construction management since that's a direction I'm considering.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on decisiveness. Overthinking has held me back in certain situations and I'm consciously trying to trust my analysis sooner and commit to action. I'm also learning more about organizational development because I think that's the direction I want to grow toward.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My communication and public speaking skills. When I'm presenting to community members or officials, I want to be clearer and more confident. I know the content — I just need to work on how I deliver it. I also want to read more on sustainable farming practices, because that's where I believe agriculture is and should be going.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to improve my listening skills. I mentioned that earlier. Also, I want to get better at formal report writing. My technical knowledge is okay, but putting it into clear written reports is something I still struggle with a bit.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on my interpersonal communication. I know I come across as cold sometimes, but that's not my intention. I want to be able to connect with people better while still maintaining my professional manner.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Soft skills, honestly. I'm fine technically. But things like presenting my work clearly, writing proper documentation, and communicating with non-technical people, those are areas I know I need to develop.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be faster without sacrificing accuracy. I also want to improve my interpersonal skills. I am aware that I can come across as too stiff. I'd like to be more approachable while maintaining my professional manner.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on my confidence, not just in the classroom, but in professional settings like this one. I also want to continue developing my lesson design skills, especially for differentiated instruction. And I want to write more, not just poetry, but professional writing like lesson plans, research, and reports.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My public speaking, definitely. I want to be able to present my findings confidently in front of larger audiences. I've been joining small speaking opportunities wherever I can. Also, I want to learn more GIS applications because I think spatial data is increasingly important in environmental work.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to pass the engineering board exam. That's the main thing. I'm also planning to improve my technical drawing skills and maybe learn more software tools.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to improve my leadership skills. I'm good with people but I want to be more confident in making decisions and giving directions. I also want to take a short course in events management.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on my confidence in speaking up, especially in meetings. I tend to hold back even when I have something useful to say. I'm going to practice this intentionally.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be more disciplined with follow-through. I have a tendency to start strong and then lose steam. I'm going to set more specific milestones for myself to stay on track.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on listening more and talking less. Not in a bad way — I like that I'm expressive — but I know sometimes I cut people off or dominate conversations when I should let others take the lead. I'm working on that. I also want to improve my focus — staying on one thing instead of jumping around.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to soften my communication style a bit. I know I can come across as harsh sometimes and I want to be better at that. Also, I want to improve my understanding of the financial side of business — not just marketing.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to be better at the business and administrative side of things — budgeting, systems, things that I wasn't as exposed to in my program. I think having that knowledge would make me more effective and versatile.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to work on my communication skills. I tend to be too quiet, and sometimes that's mistaken for being uninterested or not confident. I also want to be faster in my clinical decision-making. I know I'm capable, I just need more experience and exposure to build that confidence.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to improve my formal writing. I'm good at talking, but when it comes to writing proposals or official documents, I sometimes struggle with making things sound formal and structured. I want to practice that more.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to get better at assertiveness. I have the ideas and the thoughts, but I hold back sometimes. I want to speak up more confidently without losing my gentleness. It's a balance I'm still trying to find.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to improve my communication skills, specifically formal writing and presentations. That's been my weakness all along. I also want to learn more about agricultural technology trends so I can bring more value when working with farmers.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to improve my communication skills. I know I'm shy and I need to work on expressing my ideas better. I'm planning to join workshops or practice more in group settings.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to stop procrastinating. That's the honest answer. I'm going to set stricter personal deadlines and actually stick to them. I also want to learn cloud computing more deeply.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I want to improve my presentation skills so I can communicate my findings and ideas more confidently. I also want to learn more about sustainable agriculture practices.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to become faster and more decisive. I tend to spend too long refining things when sometimes done is better than perfect. I'm going to practice setting deadlines for myself and committing to them.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I really want to work on my communication skills. Like public speaking and just being more comfortable expressing my thoughts out loud. I know that's a big part of the professional world. I also want to learn more about the industry so I'm not starting from zero every time something new comes up.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `How quickly do you adapt to new technology?`,
    questionAvgScore: 4.35,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 4, action: 5, result: 4, reflection: 4 },
    answers: [
      {
        text: `Pretty fast. I genuinely like learning new tools. I actually enjoy that feeling of picking up something new and figuring it out. I explore things on my own a lot — that's just how I've always been. In school, I'd often experiment with things that weren't even required just because I was curious.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Reasonably quickly. I'm not a digital native in the techy sense, but I'm comfortable learning new platforms. During the pandemic, I had to learn multiple online teaching tools fast — and I did. If there's a need, I'll learn it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For agriculture-related technology, fairly quickly, because I find it genuinely interesting. Things like modern irrigation systems, soil testing kits, or GPS mapping for farms. I want to learn those. For general office technology, I'm a bit slower, but I manage.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Reasonably well. During the pandemic, our classes shifted online and I had to learn different platforms quickly, Zoom, Google Classroom, Canva for visuals. I wasn't an expert, but I managed and found ways to make the lessons engaging even in virtual settings. I'm comfortable learning new tools when they serve my students' learning.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Very quickly. I enjoy trying new tools, design platforms, analytics software, social media tools. Marketing requires staying current, so I've made it a habit to keep learning new things. I actually enjoy that part of the job.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For research-related tools, quite quickly because I'm motivated to learn them. I've used GIS software, water quality testing equipment, and data analysis tools during school. For general software, it takes me a bit longer but I manage.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Pretty fast actually. I'm used to learning new software and apps. During school, we had to shift between different design tools and I adapted quickly. I just dive in and learn as I go.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I pick it up fast. I've taught myself different design and social media tools on my own. I actually enjoy learning new platforms — each one has its own logic once you get into it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Fairly quickly, especially with communication tools and platforms. Social media algorithms, content management systems, analytics tools — these change often and I've learned to just dive in and figure them out as I go.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `It takes me a little time, but I do eventually get it. I'm not the type to pick things up instantly, but I'm persistent. I watch videos, I read guides, and I practice until I'm comfortable. During school, every time we had a new software to learn, I would spend extra time on it at home because I didn't want to fall behind.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm a quick learner when it comes to software. I've worked with different accounting software during school and OJT. I'm comfortable exploring new tools — I take my time to learn them properly rather than just rushing through and making mistakes.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Well enough. Healthcare is increasingly tech-driven — electronic health records, equipment, monitoring systems — and I've had exposure to some of that in school and clinical rotations. I take it seriously and learn carefully because errors in this field have real consequences.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Pretty well. Hotels and restaurants are increasingly using technology for reservations, guest management, billing — I've had exposure to some systems and I adapt quickly. I'd rather spend an hour learning a system well than muddle through it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Fairly well. I'm not a tech wizard, but I approach new tools with curiosity. I take time to understand how they work, not just how to use them. That helps me use them more effectively and troubleshoot better.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Reasonably. I've been exposed to some agricultural technology in school — precision farming concepts, soil testing kits, basic software for data collection. I'm comfortable learning new tools. My background isn't tech-heavy, but I'm curious and I put in the time.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Pretty quickly. I learned AutoCAD, SketchUp, and some structural analysis software during school. Whenever something new comes up, I usually YouTube it or ask someone who knows it. I'm not afraid of new tools.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `It takes me some time, but I manage. I'm not naturally tech-oriented, but I take it seriously when I need to learn something. During our training, I had to learn how to use crime mapping software. It wasn't easy at first, but I studied it and eventually used it without problems.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Pretty quickly! I grew up with a phone in my hand so I'm generally comfortable with new apps or platforms. At TSU, we used different systems for documentation and encoding. When something new came up, I usually figured it out through trial and error or quick YouTube tutorials.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm average, I think. I don't panic over new systems, but it usually takes me a few tries before I'm comfortable. I prefer having someone walk me through it once rather than figuring it out alone. I learn faster that way.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Fast. It's kind of what I signed up for. Tech changes constantly. If you can't adapt, you fall behind. I learn new tools by using them, breaking them, and figuring out why they broke. That's honestly the fastest way for me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I adapt reasonably well. I learned various accounting software during my studies and OJT. It takes me some time to become fully comfortable, but I approach new technology seriously. I don't rush, I learn the system properly so I don't make mistakes.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I adjust pretty quickly. During OJT, we had to learn a new reservation system in a short time. I watched tutorials, asked seniors, and was okay with it within a few days.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Takes me a bit. I need to understand how a new tool or system works before I fully use it. I don't like guessing with machines or equipment. But once I understand it, I'm good.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Pretty fast, honestly. Tech moves fast and you can't really survive in IT if you don't keep up. I usually just start using something and learn the details as I go.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm decent at it. I'm not a tech person by training, but I learn business tools fairly quickly — spreadsheets, project trackers, basic software. If something is relevant to my job, I'll learn it. I don't wait to be trained — I figure it out on my own first.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm okay with it. I've used AutoCAD, some structural analysis software — the basics. New tools take getting used to, but I put in the time to learn them. I don't pretend I know something I don't.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `It takes me a bit of time, but I get there. I remember when our hospital used an electronic records system during our rotation, and at first I was lost. But after a few days of practice and asking my seniors for help, I got used to it. I'm not tech-savvy, but I don't give up easily when learning something new.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I try to adapt. During the pandemic, we had to shift to online teaching very quickly. I had to learn different platforms and adjust my materials. It wasn't easy but I managed.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Healthcare technology has evolved a lot. During training, we had to learn different charting systems. I adapted by practicing outside clinical hours. I'm comfortable with new tools as long as I have time to learn them properly.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I'm a bit slow with technology initially but I'm willing to learn. We used some digital tools for mapping and data tracking during our practicum and I got used to them eventually.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I'm not that fast with new technology at first, but I'm willing to learn. I usually watch tutorials or ask for help. Once I get the hang of it, I'm okay.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `Tell me about a time when you had to give someone difficult feedback. How did you handle it?`,
    questionAvgScore: 4.48,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 4, reflection: 5 },
    answers: [
      {
        text: `One of my groupmates submitted a part of our project that was clearly rushed and not good enough to include. I told him directly but not harshly — like, 'Hey, I think this part needs more work, can we revisit it together?' I was specific about what wasn't working rather than just saying 'it's bad.' He appreciated it later, even though he was a bit defensive at first. Being specific is key — vague feedback just causes confusion.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `A groupmate submitted financial computations that had errors. I brought it up gently — I showed her where the numbers didn't match and asked if we could go through it together. I didn't say 'you're wrong.' I framed it as something we needed to fix together. She appreciated it and we corrected everything before submission.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `A fellow practicum teacher had a classroom management issue that was affecting her students' learning. She didn't notice it, but I did. I waited for the right moment, approached her gently, and said, "Can I share something I observed? I think it could help." I framed it as something I noticed, not a criticism. She was grateful and actually asked for more feedback after that.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `A fellow student teacher's classroom management was weak and it was affecting shared activity time. I asked if we could chat after school and I was honest with her — but I started by asking how she felt the lesson went, so she could reflect first. Then I shared my observation. We talked about strategies together. It didn't feel like feedback so much as a conversation.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A groupmate was documenting patient care carelessly — leaving blanks and writing illegibly. I raised it privately and specifically — I showed her the entries and explained why accurate documentation matters legally and clinically. I didn't embarrass her. She understood and improved. It was a necessary conversation.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A groupmate's portion of our research report had incorrect interpretations of the data. I pulled them aside after class and walked through it with them — not lecturing, just saying, 'Hey, I think there's something off here, let me show you what I mean.' We went through it together and they fixed it. I think showing is better than telling in situations like that.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A classmate submitted her portion of our group report with several mathematical errors. I told her privately and walked her through each one. She seemed embarrassed but appreciated that I didn't bring it up in front of the group. I told her that catching it before submission was the important thing, not the error itself.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A teammate submitted a social media post draft that had a tone that could have been offensive, though I don't think she meant it that way. I told her privately that the phrasing could be misread and walked her through why. She was surprised but grateful. We revised it together and the final output was much better.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In our group project, one of my groupmates kept submitting wrong computations. I didn't want to embarrass her so I talked to her privately and showed her the errors. She was a little defensive at first but eventually fixed it. I think it's better to talk calmly.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `One of my team members during an event kept arriving late. I had to tell her because it was affecting the whole setup. I talked to her privately, explained the impact of her tardiness, and asked if there was something going on. Turns out she had transportation issues. We figured out a solution together.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I had a fellow student teacher who was skipping observation responsibilities. I approached her privately and told her it wasn't fair to the others who were doing their share. It was uncomfortable but she adjusted afterward.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A fellow student nurse was giving inaccurate information to a patient during a simulation. I privately let her know after the session, pointed out the correct information, and showed her where she could review the topic. She appreciated it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I had to tell a teammate that her social media captions were inconsistent with our brand's tone. I showed her examples of what we needed versus what she had posted and offered to review her drafts together before posting. She was receptive.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `One of my writers kept submitting articles that lacked depth — just surface-level reporting. I sat with her one-on-one, went through her article, and showed her where she could dig deeper. I framed it as coaching, not criticism. She improved noticeably over the next few weeks.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I had a groupmate whose presentation slides were really low quality — like, it was clear they didn't put effort in. I told them privately, straight to the point: 'These slides don't reflect the quality of our project. Can you redo this before tomorrow?' They were a bit taken aback but they fixed it. I don't believe in sugarcoating, but I try to keep it focused on the work, not the person.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `A groupmate during our culinary practicum plated food really poorly — it looked rushed and unappetizing. Before we served it, I pulled them aside and said, 'Let's fix this together before the judges see it.' I didn't say it was bad — I framed it as something we should improve together. We re-plated and it looked much better. Feedback in hospitality has to be fast and kind.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In a group project, someone's drawing output had several errors that would've failed us. I told them directly, privately: 'These measurements are off. We need to fix this before submission.' I didn't soften it too much because in engineering, errors aren't something you smooth over. They appreciated the directness after we fixed it.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I had to tell a close friend and groupmate that her section of our research paper was too shallow and needed serious revision. I started by asking what she thought about it herself — she admitted she wasn't happy with it either. That made the conversation easier. I gave specific suggestions rather than general criticism. She revised it and it ended up being the strongest section. Starting with questions before conclusions is something I've learned to do.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `One of my groupmates kept submitting outputs with errors, like he wasn't reviewing his work before sending it to the group. I talked to him one-on-one and told him straight that it was causing us to redo things. I wasn't rude about it, but I was direct. He actually thanked me and was more careful after that.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A groupmate of mine submitted a portion of our thesis that had copied text from an online source. I told him directly that it was plagiarism and that it put the whole group at risk. He was defensive at first, but I showed him the policy and explained what could happen. He rewrote his section. I didn't enjoy that conversation, but it was necessary.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A junior officer in our student council was doing great in planning but she had a habit of dismissing other people's suggestions during meetings. I pulled her aside and told her gently that her energy was great but her approach was making others feel unheard. She was quiet for a moment, but then thanked me. She improved noticeably after that.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A groupmate submitted code that wasn't tested and had obvious errors. Instead of redoing it for him, I sat with him and walked through what was wrong. Not in a condescending way. I just explained what each error was and why it mattered. He was a bit embarrassed but took it well. His next submissions were better.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A groupmate during our practicum wasn't following proper field procedures. He was taking shortcuts that could affect the integrity of our data. I told him directly but without being harsh about it. I said something like, "Pare, gagawin nating tama ito kasi ang data natin, data natin lahat." We're all in this together. He understood and fixed his approach.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A groupmate was recording data carelessly during one of our field days, and it was affecting our dataset. I told him directly but calmly that the data needed to be consistent and showed him what careful recording looked like. He wasn't happy at first but he corrected his approach. Accuracy in research isn't negotiable.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `One of my groupmates had a habit of not attending meetings and it was affecting our project. I had to tell him directly but I made sure to do it in private and without making it too heavy. I told him honestly that we needed him and that his absence was putting extra load on everyone. He came around after that.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A groupmate was doing his part of the project incorrectly and it would have affected the whole output. I showed him the correct method directly. No drama, just showed him where the problem was and how to fix it. He was fine with it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `One of my groupmates was uploading broken code and it kept crashing our shared environment. I messaged him privately, explained what was happening, and showed him how to test his code locally before pushing. He took it okay.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During a group project, one member was not doing his assigned task. I spoke to him privately and told him honestly that it was affecting our output. I asked if he needed help. He admitted he didn't understand his part, so we worked through it together.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In one group project, a classmate's output was really not up to the standard we needed. I was nervous to say anything, but I talked to her privately and said something like, 'Hey, can we review this together? I think we can improve this part.' I didn't want to embarrass her in front of the group. She took it okay and we fixed it together. I think being private about it made it easier.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `There was a groupmate who kept arriving late during our duty days, and it was affecting our whole team. I didn't want to embarrass her, so I talked to her privately after our shift. I told her I was worried and asked if everything was okay. Turns out she had transportation issues. We helped her coordinate with another groupmate who lived nearby so they could commute together. It worked out in the end.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `A fellow intern was approaching a client in a way that felt more judgmental than supportive. I brought it up during our supervision meeting, framing it as something I noticed and wanted to share, not as an accusation. She was a bit defensive, but we talked it through. I think she understood where I was coming from.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Tell me something about yourself.`,
    questionAvgScore: 3.64,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Um, hi. I'm Danilyn Cruz, 23, from La Paz, Tarlac. I graduated from TSU with a degree in Environmental Science. I chose this course because I've always felt strongly about nature and the environment. Growing up near farms and rice fields, I saw firsthand how weather changes and pollution affected the land and the people working it. I'm not a very loud person, but when it comes to topics I care about, like climate or sustainability, I can talk for a long time. I also do nature photography as a hobby.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My name is Jose, BSME graduate from TSU. I'm from Capas, Tarlac. I live with my parents and younger siblings. I chose mechanical engineering because I grew up fixing things — bikes, electric fans, whatever broke at home. I'm not much of a talker honestly, but I get things done.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Hi! My name is Renz and I'm a graduate of BS Civil Engineering from TSU. I'm from Tarlac City and I'm the only son in my family. My dad is a contractor so I grew up watching construction sites — that's actually why I got into engineering. I love building things, solving problems, and honestly I just love talking to people. I'm the type who can work anywhere and with anyone.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Um, I'm Kevin, IT graduate from TSU. I'm from Tarlac City. I live with my parents and I'm the youngest in the family. I've been into computers since I was a kid — I used to open up old CPUs and see what's inside. I like gaming in my free time and I also do some freelance work on the side. I'm pretty chill but I take my work seriously.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Hi! I'm Trisha, a BSBA Marketing Management graduate from TSU. I'm from Tarlac City and I'm very passionate about marketing and branding. I grew up selling things — seriously, I used to sell snacks to neighbors as a kid. I love social media, design, and understanding what makes people buy things. I'm creative, talkative, and I have a lot of ideas.`,
        scores: [3, null, 5],
        avgScore: 4.0,
      },
      {
        text: `Good day po. My name is Rafael and I'm a graduate of BS Agriculture from TSU. I'm from Ramos, Tarlac and I come from a farming family. My grandparents and parents are all farmers. I chose agriculture because I want to contribute to improving our food system and help small farmers like my family. I'm not the most polished speaker but I work hard and I'm serious about what I do.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Hi, good day. I'm Sofia, a BA Communication graduate from Tarlac State University. I'm originally from La Paz, Tarlac. I grew up in a family where conversations were always happening — my dad is a local journalist and my mom manages a community radio. So communication has really been in my environment since childhood. I'm observant, I listen well, and I genuinely love storytelling in all its forms.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Oh, okay, sure! So I'm Renz Buenaventura, from Paniqui, Tarlac. I'm the eldest son, we're four kids in the family. My dad's a tricycle driver and my mom sells at the palengke — they're both really hardworking, and honestly that's where I get my energy from. I took up Computer Science at TSU and I really loved it, even the hard parts. I'm the type of person who talks a lot — my friends will confirm that — but I also get things done. I like gaming, watching tech stuff online, and debating about random topics with my barkada. I'm very competitive but I try to use it in a healthy way. I'm excited to be here, honestly.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Hi! I'm Jerome Manalo, from La Paz, Tarlac. I grew up in a big family — seven of us kids — and I'm the fifth. My parents are hardworking people; my mom's a seamstress and my dad does construction work. I took up Education with English as my specialization at TSU because I genuinely love the classroom. I love teaching. I had teachers growing up who really changed my life, and I wanted to be that for someone else. Outside school, I like writing short stories and playing basketball — complete opposites, I know. I talk a lot, but I also genuinely listen. I care about people.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Good morning. My name is Camille Santos, from Tarlac City. I'm the eldest of three and my parents are both government employees — my father works at the municipality and my mom's at the RHU. I took up Nursing at Tarlac State University. Growing up watching my mom work in health care influenced me a lot. I'm a calm person by nature — my friends say I'm the one they go to when things are going wrong because I don't add to the panic. I enjoy gardening and cooking in my spare time. I like being useful, and I like taking care of people.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Hi, good morning! I'm Bryan Lacson, from Capas, Tarlac. I'm the youngest in our family of four kids. My parents run a small carenderia near our barangay — so I literally grew up around food service! That's actually one reason I fell in love with Hospitality Management. I took it up at Tarlac State University and it just felt right. I enjoy meeting new people, I love food, and I'm the kind of person who genuinely enjoys making others feel welcome. My friends call me the 'host' in every gathering — I'm always the one making sure everyone has something to eat and feels included.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `My name is Sophia Aguilar, from Concepcion, Tarlac. I'm the middle child — I have an older brother and a younger sister. My parents are both in sales; my dad's in insurance and my mom sells jewelry. I took up Psychology at Tarlac State University, mostly because I was always the person in my friend group who people talked to about their problems. I wanted to understand people better — including myself, honestly. I'm observant, a bit of an overthinker, but I've learned to channel that into being genuinely analytical. I read a lot, I like long walks, and I journal almost every day.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `My name is Jerome Dela Cruz. I'm 23 years old, from Paniqui, Tarlac. I took Criminology at TSU. I come from a simple family. My father was a barangay tanod for many years, which probably influenced my interest in law and public safety. I'm not much of a talker in casual settings, but when it comes to work-related things, I'm focused and clear. I spend my free time reading news and watching documentaries.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `Good morning. My name is Hannah Grace Torres. I am 23 years old from San Manuel, Tarlac. I finished my degree in Accountancy at Tarlac State University. I am the eldest in our family of three siblings. My parents run a small sari-sari store. Growing up watching them manage their small business made me interested in numbers and financial management. I am the reserved type, but I am serious about my work and I take my responsibilities very seriously.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `I'm Nestor Pascual Jr., 24, from Gerona, Tarlac. I took Agriculture at TSU. My family are farmers. We have a small rice field that my dad and I work on during the break. I'm the only one in my family who went to college, so finishing my degree was a big deal for us. I'm not a flashy person. I like working with my hands. I enjoy being outdoors more than sitting in an office, honestly.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Hi! I'm Marco Reyes, 22, from Tarlac City. I took Business Administration major in Marketing at TSU. I chose marketing because I've always been fascinated by why people buy things, like, what actually makes someone choose one product over another. I'm the second of two kids. My parents have a small printing business, so I grew up seeing how hard it is to get customers. That probably shaped my interest. I'm competitive, I'll admit that, but I know when to step back and collaborate.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Hi, good day! I'm Lara and I'm a graduate of BS Hospitality Management from Tarlac State University. I'm originally from Bamban, Tarlac. I'm the eldest of three and I love taking care of people — that's honestly why I chose this course. I enjoy cooking, planning events, and meeting new people. I'm very much a people person!`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Good morning. My name is Andrei and I'm a registered nurse, a graduate of BSN from TSU. I'm from Tarlac City and I grew up in a family where service was always valued. My mother is a midwife and I've always looked up to her. I'm quiet in social situations but I'm very focused and composed when I'm working. I also enjoy cooking and hiking on my off days.`,
        scores: [1, 5, 5],
        avgScore: 3.67,
      },
      {
        text: `Good day. My name is Clarisse and I'm a graduate of Bachelor of Secondary Education major in English from TSU. I'm from Concepcion, Tarlac. I come from a family of teachers — both my parents are public school teachers. I love reading, writing, and I genuinely love working with young people. I know teaching is hard but it's something I really care about.`,
        scores: [2, null, 5],
        avgScore: 3.5,
      },
      {
        text: `Um, okay. So my name is Maricel Santos, and I'm from Tarlac City. I'm the second child in our family — my parents are both farmers, and I have two younger siblings. I finished my degree in Information Technology at Tarlac State University. I'm not really the type who talks a lot, but I'm the kind of person who takes things seriously when it's given to me. I like reading and I sometimes watch tutorials online during my free time just to learn new things. I know I'm not the most confident speaker, but I try my best to be reliable in whatever I do.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `I'm Mark Tolentino, from Tarlac City. Simple background — my dad's a construction worker, my mom runs a small store. I'm the second child, we're three siblings. I took Civil Engineering at TSU because I always liked building things, even as a kid. I'm not much of a talker, honestly. I prefer doing the work. I play basketball with my friends on weekends, and I like working with my hands. I'm the kind of person who shows up and does what's asked without a lot of drama.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Uh, sure. My name is Carlo Dizon, I'm from San Manuel, Tarlac. We're a farming family — my parents have a small rice farm and we also grow some vegetables. I'm the eldest of three. I took up Agriculture at Tarlac State University partly because that's what my family does, and partly because I genuinely believe it's important work. Not a lot of people my age want to go into farming or agriculture, but I think that's exactly why someone has to. I'm not the most outspoken person, but I know my stuff and I care about what I do.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Um, okay. My name is Maria Clara Santos. I'm from Tarlac City, and I just graduated from TSU with a degree in Nursing. I'm the second child in our family, we're four siblings. My mom is a public school teacher and my dad works in construction, so growing up, we didn't have everything, but we managed. I'm the type of person who's quiet at first, but once I get comfortable, I open up more. I like reading and sometimes I bake during weekends when I have free time.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Oh okay, sure! So I'm Renz Aquino, I'm 22, from Bamban, Tarlac. I took up Civil Engineering at TSU and honestly, it was my second choice. I originally wanted Architecture, but my dad said Engineering was more practical. And you know what? I'm glad he pushed me that way. I ended up really liking it. I'm the kuya in our family, two younger siblings. My dad does carpentry so I grew up around construction stuff, maybe that's why I enjoy it.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Hi! I'm Angeline Reyes, but everyone calls me Angel. I'm 22 and I grew up in Tarlac City. I took up Public Administration at TSU because I want to work in government someday. I know that sounds idealistic but I really believe public service can make a difference if the right people are in it. I live with my lola and my younger brother since my parents are working in Manila. I love talking to people, I love events, and I actually run a small online food business on the side, like, reselling homemade desserts.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Um, my name is Patricia Villanueva, but I go by Tricia. I'm 23, from Concepcion, Tarlac. I took Psychology at TSU. I chose it because I was always the person my friends went to when they had problems, and I figured, maybe I should actually study this. I live with my parents and my younger sister. I'm an introvert, honestly. I recharge by being alone. I journal a lot, and I like plants. I take care of maybe fifteen plants at home.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Hi. I'm Kevin Santos, IT graduate from TSU. I'm 22, from Tarlac City. I'm the type of person who's usually quiet in a room but will contribute when it matters. I like gaming, coffee, and honestly just building stuff, whether it's a program or a PC. My family is your typical middle-class Tarlac family. My mom works at a cooperative, my dad drives a tricycle, and I have one older sister who's a teacher. Pretty normal background. I'm not flashy but I get things done.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Hi, good morning. My name is Rafael Corpuz, but I go by Rafa. I'm 23 and I'm from Victoria, Tarlac. I finished my degree in Education, major in English, at TSU. I chose teaching because I had a teacher in high school who changed the direction of my life, and I wanted to be that for someone else someday. I'm the type of person who talks a lot in comfortable settings but gets quiet when I'm nervous, like now, a little. I write poetry in my free time and I coach our church youth group.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `Um, okay. So, my name is Maria and I'm a graduate of BS Accountancy from Tarlac State University. I grew up in a small town in Tarlac and I'm the second child in our family. My parents are both farmers, so I really had to work hard to get through school. I love organizing things and I'm very particular with numbers. I also enjoy baking during my free time. I'm not that talkative in person but I'm a good listener.`,
        scores: [1, 4, 5],
        avgScore: 3.33,
      },
      {
        text: `My name is Analiza Reyes. I'm from Victoria, Tarlac. I took up Business Administration at Tarlac State University, major in Marketing Management. I'm the third of five children and my parents both work in the barangay — my father's a barangay captain and my mom works at the health center. I'm not the most talkative person, but I'm reliable. I like planning things, I hate wasting time, and I'm pretty straightforward. I also like budgeting — weird hobby, I know, but it started because we had to be careful with money growing up.`,
        scores: [1, 3, 5],
        avgScore: 3.0,
      },
      {
        text: `Good morning. My name is Patricia Delos Reyes, and I'm from Bamban, Tarlac. I'm the only child, and my parents are both teachers — my mom teaches elementary and my dad teaches high school. I graduated with a degree in Accountancy from Tarlac State University. I've always been the studious type, I guess. I like things to be orderly and accurate. Outside of school, I enjoy reading — usually non-fiction — and sometimes baking when I have time. I'm a bit quiet, but I work well and I take my responsibilities seriously.`,
        scores: [1, 3, 5],
        avgScore: 3.0,
      },
    ],
  },
  {
    question: `What are you looking for in terms of career development?`,
    questionAvgScore: 4.24,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 4 },
    answers: [
      {
        text: `I want to be in a place where I'm constantly challenged. I don't want to get comfortable too early. I also want access to learning opportunities — training, exposure to different projects, mentors. I'm not looking for a job just because it's a job. I want to be in a place where I actually grow.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to grow clinically — deepen my skills in a specialization — and eventually take on a senior or supervisory role. I also want to be part of a team that values continuing education. The medical field evolves constantly and staying updated is non-negotiable.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Mentorship, training, and community. I want to be in an environment where I can learn from experienced educators and contribute to meaningful programs. Eventually, I want to be someone who also mentors newer teachers. I want to grow in this profession with purpose.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I want an environment where I can grow toward my CPA license and eventually take on more complex responsibilities. I'd love to be mentored by experienced professionals in the field. I'm not in a hurry, but I want a clear path.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to continue growing as an educator and communicator. If there are training programs or advancement opportunities in this organization, that's something I'd actively pursue. I want to feel like I'm evolving, not just doing the same thing year after year.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want exposure to different areas — not just one function. I'd love to learn front office, events, and eventually food and beverage management. I want to understand the full picture. I also want a company that invests in training so I can keep improving.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to gain real site experience. Not just paper work — actual projects where I can apply what I've studied. I also want to eventually get my license. And I want to grow technically — learn from engineers who've been in the field for years.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to grow into a role where I can actually help farming communities — not just in theory, but in practice. I want training and exposure to different agricultural programs. I also hope to eventually pursue further studies in agronomy or extension work.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be exposed to different types of projects, roads, buildings, maybe water systems. I don't want to specialize too early. I want to see the whole picture first before deciding where I want to focus. I also want to learn from experienced engineers who can mentor me on the job.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be in an organization where I can grow in my expertise. I want structured training, clear career paths, and mentorship from experienced officers or professionals. I don't want to stay in one place without growing.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want training and exposure to different aspects of public service, policy, community development, administration. I want mentors who can guide me. And I want an organization that values growth, where doing good work is recognized and leads somewhere.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want supervision and mentorship, especially in the early years. In psychology-related work, having a senior guide you is really important. I also want opportunities to continue learning, whether through training, workshops, or further education.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Real projects, not just maintenance tasks. I want to build things and solve meaningful problems. I also want a workplace that keeps up with industry changes, where I'm not stuck using outdated tools because nobody wants to update the system.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work on real campaigns that reach real audiences. I also want mentorship from people who've been in the industry. I learn best by watching people who are better than me do the work. I want a role that challenges me and gives me room to grow.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want fieldwork experience and exposure to real environmental programs. I'd also love mentorship from seasoned environmental scientists or practitioners. And eventually, I want to pursue graduate studies. Environmental issues are complex and I want to keep building my knowledge.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm looking for a company where I can grow professionally and eventually get support or guidance in passing the CPA board exam. I want to learn from people who are more experienced than me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work somewhere I can grow technically and be given actual responsibilities early on. I don't want to just be a runner or a bench warmer.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be in a company that values growth and gives employees a chance to take on more responsibilities. I also want exposure to different areas — events, accommodation, food and beverage — so I can grow well-rounded.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be in an environment that supports continuous learning. I'd also like the chance to eventually take on roles that allow me to mentor others or help shape school programs.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be placed somewhere that challenges me and helps me grow clinically. I also want an institution that invests in training and doesn't just rely on staff to figure things out on their own.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to work somewhere that values creativity and gives employees room to contribute ideas. I want to be where my input actually counts, not just execute other people's plans all the time.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to grow in a role where communication is taken seriously — not just as a support function but as a core part of the organization's strategy. I want to develop expertise in areas like content strategy, storytelling, and brand communication.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Stability and growth. I want a company where I can build something — not jump around every year. I want clear paths for growth and a place that actually develops its employees. Not just promises.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I want to work in an environment that takes people seriously — not just as resources but as humans. I want mentors I can learn from, opportunities to take on meaningful projects, and room to grow toward a specialization. I also hope to eventually pursue graduate school alongside work.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I want to be trained by experienced professionals and exposed to different areas, taxation, audit, financial reporting. I want to take the CPA board exam with confidence and work in a place where my skills are actually used and developed, not just filing papers.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want field experience and practical training. I want to work with real farmers and real problems. I also want to eventually take advanced training in agricultural extension or maybe a graduate program down the line. But for now, real work experience is what I need.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to work somewhere that has real projects — not just maintenance work or fixing old systems. I want to build new things and grow my technical skills continuously.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to work somewhere where I can contribute to real improvement in the agricultural sector — not just do paperwork. I want my work to have actual impact on farmers or food systems.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to grow slowly but steadily. I'm not in a rush to be promoted or anything. I just want to keep learning new things, improve my skills, and eventually reach a point where I feel confident in what I do. I also hope to work in a company that invests in training its employees.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I want to keep learning. I don't want to stay stagnant. I hope to find a workplace that offers training and maybe seminars for their staff. I also want to eventually specialize. I'm interested in maternal and child health. Just step by step, I want to grow in this profession.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I want somewhere I can actually do real work — not just assist or shadow people. I want to handle actual equipment and be trusted to do so.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `What are your biggest strengths?`,
    questionAvgScore: 4.39,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 5, result: 4, reflection: 4 },
    answers: [
      {
        text: `I think my biggest strength is that I can communicate really well. I can explain things clearly even to people who don't have a background in the topic — I had to do that a lot in school because I was often the one who understood something first in our group and then had to teach the others. I'm also good at problem-solving — I actually enjoy it, which I know sounds weird. Like, when something's not working, I get curious instead of frustrated. And I'm determined — if I say I'll do something, I follow through.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I connect well with people. I'm told I'm easy to talk to, which I think is important whether you're a teacher or working in any team. I'm also patient — very much so. Teaching trains you to repeat yourself without losing your calm, and that carries over into other areas. And I'm creative. I like finding ways to explain things differently when the first way doesn't work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Composure under pressure. In nursing school, we were frequently put in high-stress scenarios and I noticed that I stay grounded better than most. I also have a genuine sense of empathy — I care about how people feel, not just what their chart says. And I'm very observant. I notice changes in people's behavior or condition before they become bigger problems.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm great with people. I'm warm, approachable, and I make guests and clients feel at ease quickly. I'm also very service-minded — I notice when someone needs something before they ask for it. And I'm flexible. Things in hospitality don't always go as planned, and I've learned to roll with it without getting flustered.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I listen well — really listen, not just wait for my turn to speak. I think that's rarer than people realize. I'm also analytical; I look for patterns and try to understand root causes before jumping to conclusions. And I'm adaptable — I've learned that people are unpredictable, and you have to adjust your approach based on who you're working with.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I am detail-oriented. I don't miss things easily, especially in numbers. I am also very organized and disciplined. I rarely miss deadlines and I keep my work structured. I think these traits are important in accounting where one small error can have a big impact.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm hardworking. I don't know any other way to be. I grew up doing farm work so I'm used to long days and physical effort. I'm also practical. I don't overthink things. I look at the problem, figure out what resources I have, and find a way. And I think I'm dependable. If I say I'll do something, I do it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I communicate well, in writing and verbally. I can explain things in a way that different kinds of people can understand. I'm also patient. I think that's essential in teaching. And I genuinely care about people. I don't just see students as learners. I see them as individuals with different needs.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm creative and I think fast. When we brainstorm in a group, I'm usually the one throwing out ideas first. I'm also good at reading people and figuring out what they respond to. And I follow through. I don't just generate ideas and leave them hanging. I actually want to execute.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Okay so I'm very good at problem-solving. Like, when things go wrong at a site or in a project, I don't panic. I look for a solution right away. I'm also good at communicating — I can talk to both technical people and non-technical people. And I work fast, like I don't wait around when there's something to do.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm very good with people. I can talk to almost anyone and make them feel comfortable. I'm also very organized when it comes to events and schedules. And I think I'm also adaptable — I can work in fast-paced situations without getting too stressed.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm hands-on and practical. I can figure things out without being told every step. I'm also persistent — if something doesn't work, I keep trying until it does. And I don't complain much, I just do the work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm hardworking and I don't shy away from difficult tasks. I'm also observant — I notice things that others might overlook in a field or in a process. And I'm patient, which I think is important in agriculture because results take time.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I'm organized. Very organized. I plan before I act and I follow through. I'm also realistic — I don't overpromise. If I can deliver something in three days, I'll say three days, not one. And I'm good at reading situations. I notice things. Not just what's said but what's not said.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I work hard. I don't stop until the task is done. I'm also good at solving practical problems — I look at a problem and think about what can actually be done, not just what sounds good. And I'm honest. I don't say things I don't mean.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm patient. Farming teaches you that — nothing grows fast. You put in the work and you wait. That patience carries over into how I handle problems and people. I'm also observant. I notice things in the field that others might walk past. And I'm practical — I don't overthink. I see what the situation is and I deal with it.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm good at problem-solving. Like, when something doesn't go according to plan, I don't panic, I think of another way. I'm also very hands-on. I like actually doing the work, not just planning it on paper. And I communicate well with people. I can talk to workers, bosses, clients. I adjust my language depending on who I'm talking to.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I solve problems well. Like, when something breaks, I don't spiral, I debug. I'm also patient, which sounds boring but actually matters a lot in IT because you can spend hours troubleshooting something and you need to not lose your mind. I'm also pretty reliable. I don't miss deadlines and I'm consistent.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm analytical. I like looking at data and trying to understand what it means. I'm also persistent. Research and environmental work involves a lot of slow progress and I don't get discouraged easily. And I'm genuinely passionate, which I think matters. Work done with real motivation is usually better than work done just out of obligation.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I pick things up fast, especially when it comes to technology. I'm also good at solving problems without making them complicated. And I think I'm pretty good at explaining tech stuff to people who don't understand it.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm a good communicator and I connect well with people, especially students. I'm also patient — really patient. And I'm thorough when it comes to preparing materials or lessons. I don't like half-prepared work.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm good at staying calm under pressure. In healthcare, that's something you really need. I'm also empathetic — I genuinely care about the people I'm caring for, not just their medical condition. And I pay close attention to details, which is critical in nursing.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `I'm creative and I think about things from the customer's perspective. I'm also very energetic — I bring enthusiasm to projects and it tends to rub off on others. And I'm good at social media and digital content, which is very relevant right now.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm a strong communicator, both in writing and speaking. I also observe situations carefully before reacting, which helps me understand problems more fully. And I'm good at adapting my message depending on who I'm talking to.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I think I'm very detail-oriented. I notice small things that other people might miss, which I believe is important in accounting work. I'm also consistent — I don't do well one day and poorly the next. I try to maintain a standard. And I think I'm dependable. If I say I'll do something, I do it.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I think my biggest strength is that I'm patient. Like, really patient. In our clinical duty, there were times when patients were grumpy or scared, and I learned how to stay calm and just be there for them. I'm also responsible. I don't like leaving tasks unfinished. If I say I'll do something, I make sure I do it, even if it takes me longer than others.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm observant. I notice details that others sometimes miss. I'm also disciplined. I follow structure and I take rules seriously. And I think I'm someone people can trust, because I don't talk too much and I don't gossip.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Oh, I have a lot of energy, that's one! I'm enthusiastic and I like getting things done. I also think I'm good with people. I find it easy to talk to different kinds of people, from seniors to my classmates to government officials during our exposure. And I'm organized. I love making to-do lists and color-coded schedules. Is that weird? Maybe. But it works for me.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I think I'm a good listener. Like, actually listening, not just waiting for my turn to talk. I'm also empathetic. I tend to understand how people are feeling even when they don't say it outright. And I'm reflective. I think before I act. That helps me avoid making impulsive decisions.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I think one of my biggest strengths is that I'm very careful with the things I do. Like, I double-check everything before I submit or pass it. I'm also patient, especially when dealing with numbers or reports. And I think I'm reliable — if I say I'll do something, I make sure I finish it.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I think... my biggest strength is that I'm very careful with my work. I don't like submitting something incomplete or with errors. I double-check things a lot. Also, I'm patient. Like, if something is hard to figure out, I don't easily give up. I just take it slow and try to understand it better. And I think I'm a good listener too — I pay attention when someone is explaining something because I don't want to keep asking the same question twice.`,
        scores: [2, 5, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `What do you think our company/organization could do better?`,
    questionAvgScore: 3.84,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 4 },
    answers: [
      {
        text: `From what I've observed so far, I think there might be room to make the guest feedback process more consistent — not just surveys at checkout, but real-time feedback during the stay. Small things can be fixed immediately if you catch them early. But I'd need to learn more about your current processes before really commenting on specifics.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Maybe more programs that directly connect with farming communities rather than staying at the organization level. Sometimes the help doesn't reach the people who need it most.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `From what I know so far, I think there might be room to improve communication across teams — at least that's something I've noticed is a common issue in a lot of organizations. Silos between departments slow things down. I could be totally off about this specific company, though. I'd need to see how things actually work here before giving a real answer. But that's my initial thought based on general observation.`,
        scores: [5, 4, 4],
        avgScore: 4.33,
      },
      {
        text: `Based on what I've observed during my exposure, I think communication between shifts could be improved. Sometimes important information about a patient isn't fully relayed during endorsements, and that can cause confusion. Maybe a more structured handover system would help, like a checklist to make sure nothing is missed.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Maybe more investment in digital tools for project management. A lot of companies in our field still use manual methods and it really slows things down.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Maybe more consistent training and development programs for employees. Sometimes organizations say they value growth but the actual opportunities aren't visible. Regular workshops or learning sessions would help a lot.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Better staff-to-patient ratios would help enormously. Nurses are stretched very thin and it affects the quality of care. More open communication channels between management and frontline staff would also help.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I wouldn't want to say something premature since I don't know the full operations yet. But from a general standpoint, I think documentation and record-keeping practices can always be improved in any organization. Clear, consistent records prevent a lot of problems down the line. If that's something that could be improved here, I'd be happy to help.`,
        scores: [5, 4, 3],
        avgScore: 4.0,
      },
      {
        text: `If this is an agricultural organization, one thing I think many of them can improve is how they communicate with actual farmers — making sure programs reach the farmers who need them most, not just the easier-to-reach ones. Community access and trust-building are things that take real time and commitment. I don't know the specifics here, but that's usually where the gap is.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I think reaching out more to the community, being more visible, more accessible. Sometimes government offices or organizations feel distant to the people they're supposed to serve. More community touchpoints could really help. Events, open dialogues, even simple social media presence goes a long way.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `From what I know of agricultural extension services in general, reaching more small-scale farmers. A lot of programs exist, but the people who need them most, like small rice or vegetable farmers in remote areas, don't always know about them or can't access them easily. Better community outreach would help.`,
        scores: [4, 5, 3],
        avgScore: 4.0,
      },
      {
        text: `In schools and educational organizations, I think more investment in teacher development would make a huge difference. Well-supported, well-trained teachers produce better outcomes. Also, more open dialogue between administration and teachers. Teachers on the ground see things that policy makers don't always see from the top.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Based on what I know of environmental organizations in general, community engagement could often be stronger. A lot of programs focus on the technical side but don't bring the local community along in a meaningful way. When communities understand and own environmental programs, the outcomes are much better.`,
        scores: [4, 5, 3],
        avgScore: 4.0,
      },
      {
        text: `Maybe more personalization in customer service. A lot of companies use very script-based service and it can feel robotic. Adding more genuine, personal touches to how you interact with clients can go a long way.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Maybe more investment in digital and social media presence. Some companies still underestimate how much online visibility matters. Even small improvements in content consistency can make a big difference.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Maybe a more consistent and clear internal communication strategy. A lot of organizations focus on external messaging but their internal communication is unclear or inconsistent. That can lead to confusion among employees and affect the overall culture.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I'd need more time here to give a fair answer. But one thing I notice in a lot of companies is the gap between what management plans and what frontliners actually experience. Better feedback systems between levels would help. But again, I'd want to see how this company operates first before making any real suggestions.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `I'd need to be here longer to really say. But in general, I think companies can do better at listening to field workers or junior engineers who are actually on the ground. Sometimes the best insights about what's not working come from the people directly involved in the work, not management.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `I don't want to assume too much since I'm just an applicant, but from what I've seen in construction companies in general, documentation and record-keeping could always be better. A lot of issues on-site happen because something wasn't written down properly. Better documentation systems can really prevent a lot of problems.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `Without knowing the full internal workings, I'll just say, from an outsider's view, organizations like this could benefit from more community-oriented programs. Building trust with the public makes the work more effective. That's something I believe strongly in.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `I think most workplaces, including organizations in the mental health or social services space, could do better at supporting their own staff's mental health. It's easy to focus outward and forget that the people doing the work also have needs. Burnout is real, and I think prevention starts from the top.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `I think most organizations can benefit from stronger internal controls, especially smaller ones that rely on informal processes. Having clear, documented procedures reduces the risk of errors and irregularities. I don't mean that there are problems here, just that it's an area where improvement is usually always possible.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `Without knowing the full picture, I'd say most organizations could benefit from being more consistent with their digital presence. A lot of good organizations have great programs but their online communication doesn't reflect that. Better storytelling could help them reach more people.`,
        scores: [4, 4, 3],
        avgScore: 3.67,
      },
      {
        text: `Maybe a clearer feedback channel for users or clients. In a lot of tech companies, user feedback gets lost and doesn't actually reach the development team. That gap causes a lot of fixable problems.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `Honestly, I don't know enough yet about how this company operates to give a specific answer. But from what I've seen so far, I think maybe having more structured onboarding for new employees would help. A lot of companies don't invest much in that and it affects how quickly new people can contribute. But again, I might be wrong — I haven't seen the full picture.`,
        scores: [2, 4, 4],
        avgScore: 3.33,
      },
      {
        text: `In education settings, I always notice that student or community feedback isn't gathered often enough — or when it is, it's not really acted on. If that applies here in any form, I think a stronger feedback loop between employees and leadership would make a real difference. But I'd need to know the organization better to be more specific.`,
        scores: [3, 4, 3],
        avgScore: 3.33,
      },
      {
        text: `From a psychology perspective, most organizations underinvest in employee well-being and internal communication. People perform better when they feel psychologically safe — when they can raise concerns without fear. I don't know enough about this company specifically to say whether that's an issue here, but it's worth examining in any organization.`,
        scores: [3, 4, 3],
        avgScore: 3.33,
      },
      {
        text: `Without inside knowledge, I'd guess documentation. Most tech companies and organizations are guilty of having outdated or nonexistent documentation. It makes onboarding harder and causes repeated mistakes. Better documentation culture would probably make everything smoother.`,
        scores: [3, 4, 3],
        avgScore: 3.33,
      },
      {
        text: `Honestly, I don't know enough about your company yet to make a specific suggestion. But generally, making sure frontline workers have the right tools to do their jobs is something a lot of companies overlook.`,
        scores: [3, 4, 3],
        avgScore: 3.33,
      },
      {
        text: `If I'm being honest, many healthcare institutions could improve nurse-to-patient ratios and invest more in staff wellbeing. Burnout in nursing is a real problem that affects care quality. I don't know the specific situation here yet, but if there are support systems for the staff, that would stand out to me as a very positive sign.`,
        scores: [2, 4, 3],
        avgScore: 3.0,
      },
      {
        text: `I'm not that familiar yet with how your company works, so I can't say much right now. But maybe clearer communication between departments could help, just based on what I've heard is a common issue in many organizations.`,
        scores: [2, 3, 4],
        avgScore: 3.0,
      },
    ],
  },
  {
    question: `What is your biggest weakness?`,
    questionAvgScore: 3.94,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `I can be blunt. Sometimes people take it the wrong way. I don't mean to be rude, I just say what I think is true. I'm trying to be more mindful of how I phrase things. Also, I'm not the most patient when things are disorganized or when people are wasting time — I get frustrated, though I try not to show it too much.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Honestly? I talk too much. My professor actually told me once during a presentation to 'let others speak.' I'm working on it. I also tend to get too absorbed in something I find interesting and forget the other things I'm supposed to be doing. Like, I'll spend three hours deep in one problem and realize I forgot to do something else. So time management is something I'm consciously improving on.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I sometimes have difficulty saying no, even when I'm already overloaded. I take on tasks because I don't want to disappoint anyone, and then I end up overwhelmed. I'm getting better at managing this — learning to communicate my workload more clearly before agreeing to additional tasks.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I tend to internalize stress. I don't always show it, but sometimes I carry more than I let on, and it catches up with me. I've been working on processing things better — journaling, talking to people I trust — so I don't just bottle everything.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I talk too much sometimes. Like, during meetings or group discussions, I tend to dominate the conversation without realizing it. My professor actually pointed that out. He said I should learn to listen more. I've been working on it, but it's a real effort for me, honestly.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I can be too rigid sometimes. If something is outside my plan, I get a little uncomfortable. I'm not very flexible with sudden changes. I know that's something I need to work on, especially in a work environment where unexpected things happen all the time.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm not great at explaining technical things to non-technical people. I try, but I sometimes use terms I forget not everyone knows. I've been working on it, like, explaining things the way I'd explain them to my mom who barely knows how to use her phone. That's my test. Can my mom understand it? Usually the answer is no, which means I still need to work on it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I can get impatient when things move too slowly. Like, I have an idea and I want it done yesterday. That's not always realistic or fair to the team. I've had to learn to slow down and let processes happen at their proper pace. I'm still working on that, honestly.`,
        scores: [5, 4, 4],
        avgScore: 4.33,
      },
      {
        text: `I'm not a strong public speaker. I get nervous presenting in front of large groups. My voice gets quieter, I lose my train of thought. I've been working on it but it's a real challenge for me. I'm better in smaller group settings or one-on-one.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Honestly, I'm not good at speaking in front of people. It makes me nervous. Even in school, when we had to present, I would prepare a lot but still end up shaking a little. I know it's something I need to work on. Also, sometimes I take too long on one task because I keep going back and checking it. My groupmates used to tease me about it, but I just really don't want to make mistakes.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I care too much sometimes. Like, if a student or a team member is struggling, I get emotionally invested and sometimes spend too much time on one person when I need to move forward. I'm learning to balance compassion with efficiency. I haven't perfected it yet.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm not great at presenting my ideas. I know what I'm thinking but putting it into smooth, polished words is hard for me. I'm working on it. Also, I'm stubborn sometimes — when I'm convinced I'm right, I push back hard, and that can cause friction.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `I overthink. I analyze situations to the point where I delay decisions because I'm still processing. It's gotten better, but it's something I'm conscious of. I've learned to set time limits for my deliberation — after that point, I commit to a direction.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I talk too much, my friends say that all the time. Sometimes during meetings I go on too long and lose my point. I'm also not the best at saying no. Like, if someone asks for help, I almost always say yes even when I'm already overwhelmed. I've been trying to learn to manage my commitments better.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `I take too long sometimes to make decisions because I'm analyzing everything. It's good for some things, but when a quick decision is needed, I can struggle. Also, I absorb other people's stress easily. If someone around me is anxious, I feel it too. I'm still learning how to manage that.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm not confident with formal presentations and writing reports. In school, my practical outputs were always good, but when it came to written requirements, I'd struggle to express my ideas clearly. I know what I want to say, but putting it into formal language is hard for me.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I talk too much sometimes. My friends tell me that. I tend to go on and on during discussions even when I should just listen. I'm aware of it though, so I've been trying to let others finish first before I speak.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I overthink sometimes. I analyze situations too much before deciding, especially in non-emergency situations. I've had moments where my delay caused minor inconveniences. I'm working on trusting my assessment more.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I'm not very confident presenting in front of people. I know my material but when I have to speak formally, I get nervous. I'm working on this by joining more speaking activities.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I get too excited sometimes. Like, I'll take on too many things because I want everything to be great and then I spread myself thin. I'm working on being more realistic about my capacity. Also, I talk fast when I'm nervous, which I'm aware of.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I'm not very confident in formal settings. Like, I'm fine in the field but put me in a room with executives and I get a little stiff. I'm working on that. Also, I don't speak up often enough in group discussions, even when I have something to say. I'm quieter than I should be sometimes.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I overthink a lot. Like, before I do something, I keep second-guessing myself if I'm doing it right. My classmates would sometimes tell me, "Mare, just do it." It slows me down sometimes, especially when I need to decide quickly. I'm still working on that, trying to trust myself more.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I can be a perfectionist, and that sometimes slows me down. I spend too long checking and rechecking things. My classmates would sometimes say, "Hannah, it's done, submit it already." I'm aware of it and I've been trying to work on balancing accuracy with efficiency.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I second-guess myself a lot. Even when I know I'm doing the right thing, I'll sometimes slow down and wonder if I should be doing something different. It's a kind of insecurity I'm still dealing with. My mentor teacher during student teaching actually pointed it out. She said I have the skills, I just need to trust them more.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I sometimes have difficulty saying no. When someone asks for my help, I tend to say yes even when I'm already overwhelmed. It has led to burnout before. I'm learning to set boundaries better.`,
        scores: [2, 5, 4],
        avgScore: 3.67,
      },
      {
        text: `I have too many ideas sometimes and I lose focus. I get excited about new concepts and jump to them before finishing what I was doing. I'm learning to prioritize and finish tasks before starting new ones.`,
        scores: [2, 5, 4],
        avgScore: 3.67,
      },
      {
        text: `I can be too analytical sometimes. I spend a lot of time thinking about the best way to say or do something that I delay acting. It's something I'm trying to manage by setting time limits for myself when making decisions.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `Honestly, I think my biggest weakness is that I'm too quiet sometimes. I don't speak up that much in meetings or group discussions even if I have an idea. I'm working on it, but it's not easy for me. I also tend to take more time than others because I want to make sure everything is correct.`,
        scores: [2, 4, 4],
        avgScore: 3.33,
      },
      {
        text: `I can be too emotional sometimes. Like when a guest is rude or a situation doesn't go as planned, I tend to feel bad about it more than I should. I'm learning to be more detached and professional, but it's something I'm still working on.`,
        scores: [2, 4, 4],
        avgScore: 3.33,
      },
      {
        text: `I'm not good at documenting my work. I tend to just fix or do things and forget to write it down properly. It's caused problems before and I know I need to be better at it.`,
        scores: [2, 4, 4],
        avgScore: 3.33,
      },
      {
        text: `I procrastinate sometimes. Not because I don't care but because I tend to underestimate how long things will take. I've missed some deadlines before because of that. I'm more aware of it now and I've been using reminders and schedules.`,
        scores: [2, 4, 4],
        avgScore: 3.33,
      },
    ],
  },
  {
    question: `What is your greatest failure and what did you learn from it?`,
    questionAvgScore: 4.44,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 4, action: 5, result: 5, reflection: 5 },
    answers: [
      {
        text: `My greatest failure was a coding competition I joined in my second year. I thought I was well-prepared, but I froze under the actual competition pressure and my output was terrible. I got embarrassed in front of people I knew. What I learned was that preparation alone isn't enough — you also have to practice performing under actual pressure, not just in comfortable settings.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `There was a time I was too confident that a patient was fine and didn't escalate a concern I noticed quickly enough. Nothing serious happened, but it was close. It taught me that intuition should always be raised, even when you're not 100% sure. It's better to ask and be wrong than to be quiet and be right about a bad outcome.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `In my first student teaching placement, I struggled with classroom management. I was too friendly, too lenient, and the students took advantage of it. I had to rebuild authority in the second half of the rotation, which was harder than doing it right from the start. I learned that kindness and firmness aren't opposites — you can be both.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I once got too comfortable with a regular guest and overstepped a professional boundary — I was too casual, almost like talking to a friend. The guest didn't mind, but my supervisor pointed out that professionalism needs to be consistent regardless of how friendly the guest is. It was a small thing but an important lesson. Warmth and professionalism are both possible at the same time.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I overcommitted in my second year. I was an officer in three organizations and running our outreach program and my grades dropped. I had to step down from one organization, which I felt really guilty about. But it taught me that saying yes to everything isn't a strength. It's actually a disservice to all the people counting on you. I learned to be more honest about my limits.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In my first year, I almost quit college. The academic writing requirements were so different from anything I grew up doing, and I nearly failed one subject. I thought maybe college wasn't for me. But my mom told me to just finish. "Kahit mahirap, tapusin mo." Even if it's hard, finish it. I stayed, asked for help from classmates and professors, and improved. I learned that asking for help isn't weakness. It's practical.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I chose a thesis topic that was more ambitious than our resources and time could support. We had to significantly narrow the scope midway through, which was frustrating and delayed us. I learned to be more realistic about what's achievable with the resources available. A focused study done well is better than an ambitious one done poorly.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I failed one of my major subjects in second year. I was overconfident and didn't study as much. I had to repeat it and that really affected my grades. I learned that no matter how good you think you are, you still need to prepare.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I once forgot to confirm a booking with a supplier during a school event project and we almost didn't have chairs and tables on the day of the event. I learned to always double-check and have a confirmation system in place.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I took on a freelance project that was way beyond my skill level at the time. I said yes because I needed the money. I couldn't finish it on time and the client was unhappy. I learned to be honest about what I can and can't do before agreeing to anything.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I had a clinical rotation where I was assigned a patient I felt I wasn't ready for. I was so anxious that I made documentation errors. I learned that seeking guidance early is not a weakness. Asking for help is part of being a responsible nurse.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I launched a small online selling business in college that flopped after two months. I didn't research my market well enough. I just assumed people would buy. I learned that good products still need good market understanding.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `In my second year, I failed a subject. It was embarrassing because my parents didn't know for a while. I had to take it again the next semester. It was a wake-up call because I realized I had been spending too much time on groupwork for other subjects and neglecting that one. I learned to balance better and to ask for help earlier instead of waiting until it's too late.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I failed one board subject during a mock exam review. It hurt my confidence a lot. But I went back, identified exactly which topics I was weak in, and drilled those specifically. I passed the same subject in the actual mock board after. Failure is information — it tells you exactly where to go back.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I once joined a leadership role in school that I wasn't ready for. I accepted it to challenge myself, but I underestimated how much I didn't know. I made decisions based on theory without enough practical understanding of the situation. It caused some friction in the team. I stepped back toward the end of the year and supported the new leader instead. It taught me the difference between wanting to lead and being ready to lead — and that they're not always the same thing.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In my third year, I failed to properly plan a school vegetable garden project I was assigned to. I thought I knew what to do without mapping it out first, and the layout ended up being inefficient. The crops grew but the space was not used well. My professor gave us a below-average grade on the design portion. I learned that even if you know what you're doing, planning on paper first saves you a lot of trouble later. Experience isn't a substitute for planning.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I failed one of my major exams in third year, Pharmacology. I cried a lot because I studied hard for it. But then I realized my way of studying wasn't effective. I was just reading without really understanding. After that, I changed how I reviewed. I started making concept maps and teaching the lessons to myself out loud. My grades improved after that. It was embarrassing but it taught me a lot.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I almost failed one of my engineering major subjects in second year because I was overconfident. I thought I understood the material but I wasn't reviewing properly. I barely passed. That really shook me. After that, I started taking my review time more seriously and not assuming I already know something just because I heard it once.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I failed to qualify in an initial competitive application for a government training program. I think because I wasn't confident enough during the interview. I answered correctly but I was too stiff. After that, I practiced my communication more. I realized that knowing the material isn't enough. You also have to present yourself well.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I procrastinated on a major requirement until the night before and submitted something I wasn't proud of. I got a passing grade but I knew it wasn't my best work. It was a wake-up call. I started using project management tools after that, just simple ones like Trello, to break tasks into smaller parts and not let them pile up.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I over-studied theory in one subject and neglected the problem-solving practice. I did poorly in that exam because the questions were computation-heavy. I learned that in accounting, knowing the concept is not enough. You have to practice applying it. I changed my study approach after that.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I once had a lesson that completely flopped. The activity I designed was too advanced for the level of the class and students were frustrated and disengaged. I finished the class feeling terrible. But afterward, I re-examined my lesson design and realized I hadn't connected my activities to where the students actually were. I became much more intentional about starting from the learner's perspective, not my own.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I once pushed too hard for my own idea during a group project and basically bulldozed my team's suggestions without realizing it. We went with my approach, it didn't work as well as expected, and my groupmates were understandably frustrated. That was a big lesson in humility. Good ideas survive feedback. If you're not willing to have your idea challenged, it's probably not as good as you think.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I ran for student council secretary and lost. I thought I was gonna win because I was popular in class. It taught me that likability alone doesn't win elections — you need a real plan and real commitment. I applied that lesson to everything after.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I once submitted a project report with wrong calculations because I rushed it. I passed but barely. I learned to always review before submitting, even if I think I'm done.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I planted a variety of crop in our small trial plot that wasn't suited to the soil in that area. The yield was very poor. I should have tested the soil first. I learned to always start with a proper site assessment.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In one school publication issue, I pushed for a bold, unconventional cover story topic that I thought would spark conversation. The execution didn't land the way I envisioned and some readers were confused by it. I learned that innovation still needs to be grounded in clarity and audience understanding.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I failed to delegate well during one major school project. I took on too much because I didn't trust others to do it right, and I burned out near the deadline. We passed, but I was a mess by the end. I learned that control isn't always efficiency. Let go of some things so you can focus on what really matters.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I took on too many school commitments in my third year — academic clubs, organization work, plus review materials. I spread myself too thin and my grades dipped slightly in one subject. It wasn't failing, but it was below my standard. I learned that saying yes to everything is not actually a strength. Prioritizing is.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I avoided a conflict in my first groupwork in college instead of addressing it, and it eventually blew up into something much bigger. I learned that avoiding difficult conversations doesn't make them go away. It just delays and worsens them. Since then, I've practiced being more direct, even when it's uncomfortable.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `There was a group project where I agreed to do most of the work to avoid conflict. I ended up overwhelmed and the output wasn't my best. I learned that protecting peace at the expense of fairness doesn't work.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `What is your professional achievement you're most proud of?`,
    questionAvgScore: 4.5,
    totalAnswers: 31,
    breakdown: { situation: 5, task: 5, action: 5, result: 5, reflection: 5 },
    answers: [
      {
        text: `During my OJT, I was assigned to help organize some of the digital files of the company. It was kind of messy and nobody really wanted to do it. But I volunteered, and I finished it in about two weeks. My supervisor actually mentioned me during one of their small meetings and said I did a good job. That was a small thing but it meant a lot to me because I wasn't expecting to be noticed.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During my OJT, I was part of a small team doing internal documentation. It was boring work, honestly, but I noticed that the way it was organized made it hard to find things. So I asked my supervisor if I could restructure it, and she said yes. I spent a few days on it and the team actually used my new structure going forward. It wasn't a big dramatic thing, but knowing that my work actually changed something real — that felt good.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During my internship at a community center, I was part of a team running a mental health awareness program for barangay youth. We had limited resources and the attendance was low at first. I suggested changing the framing — instead of 'mental health seminar,' we called it a workshop on handling stress and peer pressure. Attendance doubled the next session. The words you use matter more than people think.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `During my OJT at an accounting firm, I was given the task of reconciling some records that had discrepancies going back several months. It was painstaking work, but I found the errors and documented everything clearly. My supervisor said my work was one of the cleanest they had seen from an OJT student. I don't say that to boast — it just meant a lot to me because I had worked very carefully on it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my student teaching, I had a class where one student was really disengaged — he never participated and would just put his head down. I spent extra time figuring out what he was interested in and found a way to connect the lessons to that. By the end of my rotation, he was one of the more active students in discussions. That probably sounds small compared to corporate achievements, but it meant everything to me.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our clinical exposure, I was assigned to an elderly patient who was very agitated and uncooperative. Most of the staff found it hard to get through to her. I took time to just sit with her and listen — not medical questions, just conversation. Over a few visits, she became more cooperative. My supervising nurse mentioned it during our evaluation. It reminded me that care isn't just clinical — it's human.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Our thesis project. We designed a low-cost footbridge for a barangay in our town that had no proper crossing over a small river. It wasn't built yet, but the design was presented to the barangay captain and they actually said they'd consider it for their budget proposal. That felt real. Like, this wasn't just a school project, it could actually help people.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `During our OJT at a local accounting firm, I was tasked with reconciling several months of bank records. There was a discrepancy that had been there for a while that others hadn't caught. I found it. It was a small duplicated entry. My supervisor was surprised and said that the firm had been trying to trace it. I was happy that my attention to detail actually made a real difference.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our OJT at a government agricultural research station, I was part of a team testing a variety of rice seedlings for yield potential. I was responsible for daily monitoring and recording growth data. The variety we tested showed a 15 percent higher yield than the local variety being used. I was proud because that finding could actually help farmers in our area.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my student teaching, I had a Grade 8 class where several students were really struggling with English, not just academically, but they were embarrassed to speak up in class. I tried a different approach. I let them write anonymous questions and we discussed them as a class. Over time, they started raising their hands. By my last week with them, three students who hadn't spoken in class before were actively participating. That meant everything to me.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For our thesis, we created a marketing campaign proposal for a real local business here in Tarlac. The owner actually sat in on our presentation and at the end, he said he wanted to implement a few of our recommendations. That was huge for me. Knowing that real work we did as students could actually be used meant a lot.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `For our thesis, we conducted a study on water quality in a river system in our province that had been affected by agricultural runoff. Our findings were presented to the provincial environment office and they said the data would be useful for their monitoring program. That felt like the most meaningful thing I'd done in school, knowing the research could actually inform real policy.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our thesis project, we designed a small drainage system for a barangay near our school. We actually presented it to the local officials and they said it was feasible. It wasn't implemented yet but the fact that actual officials considered it — that was a big deal for us.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my clinical rotation, I was the one who noticed a patient's abnormal vital signs that others had missed because it was a busy shift. I alerted the nurse on duty and they acted immediately. The patient was stabilized. It wasn't heroic, just attention to detail.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I handled the social media accounts of our college department during an event week. We grew engagement significantly during that period and our posts reached people outside the school. Our dean actually noticed and complimented our team.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During our field practicum, I developed a composting method using materials commonly available in our barangay that reduced input costs for our test plot. Our professor said it was a practical and scalable idea for small farms.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I wrote a feature article for our school publication that was later shared by a regional media outlet. It was about the condition of public school facilities in Tarlac. A local official reached out to the school after reading it. That showed me that good writing can actually spark something.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `During my OJT at a small trading company, I helped them clean up their inventory records because everything was scattered in different notebooks and files. I created a simple system — nothing fancy — and trained the staff on how to use it. When I left, the manager said it was the most useful thing an OJT student had done for them in years. That's the kind of thing I'm proud of.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During my OJT at a hotel in Clark, I was assigned to the front desk. After a few weeks, I was commended by a guest in a feedback form — they specifically mentioned my name and said I was the friendliest staff they'd encountered. That feedback was posted on the bulletin board. My supervisors teased me about it but in a nice way. It felt great because it was exactly what I was trying to do.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During my OJT, I caught an error in a structural computation that the team almost submitted. I double-checked the numbers because something felt off to me. Turns out there was a calculation mistake that could have been a serious problem later. My supervisor thanked me and told me to always trust that instinct. That stuck with me.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our last clinical rotation in the pediatric ward, I was assigned to a child who was really afraid of needles, like, screaming every time someone approached her. My CI told me to handle it, and I spent time just talking to her, drawing with her, making her comfortable. When it was time for her IV insertion, she didn't cry as much. My CI actually commended me in front of the class. That meant a lot to me.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During our field exposure in a local police station, I was tasked with organizing and digitizing old case documents that were just piled up in a stockroom. It took two weeks, but I created a simple filing system that made it easier for the officers to find records. The station commander thanked me personally. It wasn't glamorous work, but I was proud of doing something useful.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `We organized a community outreach program for our department. It was a livelihood seminar for residents of a nearby barangay. I was the overall coordinator. We had almost 80 participants, and everything went smoothly. After the event, one of the attendees came up to me and said it was the first time her barangay had been included in that kind of program. That really touched me.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I built a small inventory management system for a small store as part of a school project, nothing fancy, just a basic desktop app. But when the store owner actually started using it and said it saved her time, that felt really good. It's probably the most "real" project I've completed where someone outside school actually benefited from it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During my OJT at a hotel in Clark, I handled the front desk during a very busy weekend. One guest was very upset because of a booking issue. I stayed calm, listened to him, and resolved it by offering a room upgrade. He left a positive review for us. That meant a lot to me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `During my internship at a manufacturing company, I helped troubleshoot a machine that had been malfunctioning for two weeks. The maintenance team hadn't figured it out yet. I looked at it for a few hours and found that the issue was a misaligned belt. Simple fix, big impact.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I built a simple inventory tracking system for a small store as a freelance project. It wasn't anything fancy but the owner said it saved them a lot of time compared to their manual process. That was a good feeling.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `During my OJT with a government agricultural office, I helped a small group of farmers troubleshoot why their vegetable yields were lower than expected. We identified it was a soil issue. I helped them with a simple soil improvement plan using accessible materials. The farmers actually saw improvement in the next planting cycle. I wasn't there to see it, but they told my supervisor and she relayed it to me. That felt good. Real good.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `In our fourth year, I facilitated a small group session for incoming freshmen as part of an adjustment program. I prepared the activities, guided the discussion, and helped students talk about their anxieties about college life. Afterward, a few of them came up to me and said they felt better. That felt meaningful to me, more than any grade I got.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `During my student teaching, I developed a reading activity for struggling learners in my class. Several students who weren't participating started to engage more. Seeing that was more rewarding than any grade I received.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `During my on-the-job training, I helped the accounting team organize their filing system. It wasn't a big thing, but they said it helped them a lot in finding documents faster. That made me happy because I know I contributed even in a small way.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `What kind of goals would you have in mind if you got this job?`,
    questionAvgScore: 4.43,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 5, result: 4, reflection: 5 },
    answers: [
      {
        text: `Deliver consistent, quality care. Build trust with colleagues and supervisors. Pass the board exam. And within a year, identify a specialization I want to deepen my practice in. I'm here to grow, not just to be employed.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Build strong, trusting relationships with my students. Improve my craft as a teacher every semester. Contribute to the school or organization's programs beyond just my class. And long-term, I want to be part of initiatives that improve how English is taught in schools where resources are limited, because I know what that's like.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `Short term, I want to contribute quickly and make the team's work a little easier or better in whatever way I can. Longer term, I want to take on more responsibility and eventually lead something. I want this job to be the start of a career, not just a paycheck.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `First, to master the role and the processes. Then, to add value — not just complete tasks but actually improve how things are done. And in the longer term, to grow within the company and take the CPA exam.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Deliver great guest experiences consistently, build strong relationships within the team, and learn as much as possible from senior staff. I want to earn trust quickly and take on more responsibility within my first year.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Learn the company's projects and processes. Contribute technically and reliably. Take the board exam. And within a year, be the person my team can trust to identify problems before they become bigger ones.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Build trust within the team, contribute my understanding of people to team dynamics and processes, and take on increasingly complex responsibilities over time. I also want to be someone who makes the work environment slightly better for the people around me — not just in deliverables but in how the team functions day to day.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `To serve the farmers in the communities I'd be assigned to as effectively as I can. To apply what I've learned and keep learning from the work itself. Long-term, I want to help at least a few farming families improve their yield and livelihood. That's a meaningful goal for me.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Understand the brand and the audience deeply in the first few months. Then start contributing meaningful ideas to campaigns. Eventually, I want to lead a project from concept to execution. That's where I want to be.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to contribute to at least one successful project this year and learn as much as I can about the company's processes. I want to prove early that hiring me was worth it.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `To prove that I can handle responsibility and then take on more. I want to build a track record here — small wins that add up. I'm not looking for recognition, just results.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `Build genuine relationships within the team, contribute meaningfully to whatever programs or projects I'm assigned to, and eventually take on more responsibility. I want to leave a mark in the right way — through quality work and real connections.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Learn the programs inside and out, make real connections with the communities I'll be serving, and contribute at least one practical improvement to how the work gets done. I want to leave a mark — even a small one — in a real community within my first year.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Short-term, learn the company's processes and get licensed as soon as possible. Long-term, I want to eventually lead a project team. Not immediately, but within a few years. I want to grow within this organization.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First, to understand the organization well and perform my duties correctly. Then, to build a reputation of reliability and integrity. Eventually, I want to take on more responsibilities and contribute to the organization's mission in a meaningful way.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to understand the organization's programs deeply in the first few months. Then start contributing my own ideas and energy to those programs. Long-term, I want to help expand the reach of the organization's services and be part of meaningful community impact.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Short-term, contribute to the team and understand the systems well. Medium-term, take ownership of at least one feature or project. Long-term, grow into a role where I'm making technical decisions and mentoring newer developers.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Pass probation with strong performance. Learn the organization's financial systems well. Eventually contribute to improving internal processes. And personally, I want to pass the CPA board. That is always a goal.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `To contribute meaningfully to the organization's environmental programs from the start. To learn from the experienced people here. And eventually to lead a project from planning to completion. I want to feel the full cycle of environmental work, not just one part of it.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `My main goal is to do my tasks correctly and consistently. I also want to learn as much as possible so I can contribute more to the team as time goes by.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `My first goal is to master my role and deliver excellent service consistently. Then I want to contribute ideas that can improve the guest or client experience. And eventually, I'd love to mentor newer team members.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To be fully functional in my role within the first three months. Then start contributing to process improvements. I want to earn trust through consistency.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Short-term, I want to deliver quality work consistently. Medium-term, I want to contribute to at least one project that I'm proud of. I just want to grow steadily.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To build meaningful relationships with students and contribute to their growth as learners. I also want to grow professionally and eventually share my knowledge by mentoring junior colleagues.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To provide safe and compassionate care consistently. To earn the trust of my patients and the respect of my colleagues. And to keep growing so I can contribute more as time goes on.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To contribute to at least one campaign this year that delivers measurable results. I also want to build my portfolio with real work, not just school projects.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To contribute to at least one program or project that directly benefits farming communities. I also want to establish myself as someone reliable and knowledgeable within the organization.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `To understand the organization's communication needs deeply and contribute work that is clear, effective, and aligned with the mission. I also want to build relationships with colleagues across departments and be a reliable communication resource.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `For the short term, I want to learn the job properly and make sure I'm useful to the team. In the longer term, I want to contribute something meaningful — like help improve a process or be the person others can come to for help. I want to earn my place here, not just occupy a slot.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `My short-term goal would be to learn the ward's system and earn the trust of my seniors and co-nurses. Long-term, I want to be someone the team can rely on, and eventually contribute to improving patient care in small but meaningful ways. Nothing too big. Just consistent and steady.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Honestly, first just to be good at what I'm assigned to do. Then to build connections within the team and contribute meaningfully to the work. Eventually, I'd like to be someone others in the organization can turn to for support or guidance, not as a superior, just as someone reliable and trustworthy.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `What kind of work environment do you like best?`,
    questionAvgScore: 4.2,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 4, action: 4, result: 4, reflection: 4 },
    answers: [
      {
        text: `I like environments where people respect each other and where there's open communication. I work well when there's collaboration and when I feel like my contribution is valued. I also like a bit of variety — I don't do well when every day is exactly the same routine with no room to be creative.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `A professional environment where people respect each other, communicate clearly, and work as a team. I function best when there's structure — clear protocols, defined responsibilities — but also where people genuinely support one another. Healthcare can be tough, and the team dynamic makes a big difference.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I like environments that are collaborative and positive. Places where people actually say good morning to each other! I don't do well in very cold or silent offices. I like when there's energy, not chaotic, but alive. I also appreciate when supervisors are approachable. I work better when I feel comfortable asking questions.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A collaborative one where people actually support each other. I like it when teachers or colleagues share ideas and resources freely instead of competing. I also appreciate environments that value the well-being of everyone, both the staff and the students or clients they serve. Toxic environments make it hard to do good work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I like environments where people are actually talking to each other and sharing ideas. I get bored in very rigid, silent setups. I work best when there's some energy around me. That doesn't mean chaotic — I still need structure — but I like when people are collaborative and open to discussion. And I like managers who explain the 'why' behind things, not just give orders.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Structured. I need to know what the expectations are and what the rules are. I don't like environments where the processes keep changing or where there's no clear direction. I work well independently but I also collaborate fine as long as there's a clear goal.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I prefer an environment that is professional and quiet enough for concentration. Accounting work requires focus, and I do my best in settings where I can think clearly. I don't mind working with a team — I actually enjoy the collaboration — but I also value time to work independently without too many interruptions.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Fast-paced and people-heavy. I like being around action. Quiet environments are nice for other people, but I thrive when there's energy — when there are guests coming in, things happening, problems to solve on the spot. That's when I feel most alive at work.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I like environments that are active, not the kind where everyone just sits and stares at their computer all day. I prefer being on-site, checking things, solving real problems in real time. I also like when management trusts their team. Micromanagement kills creativity, I think.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I prefer a structured environment with clear authority and clear expectations. I work best when I know exactly what my role is and what the rules are. I'm not good at workplaces that are very informal or chaotic. It distracts me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Somewhere that doesn't micromanage. I do my best work when I'm trusted to figure things out. I don't need someone checking on me every hour. Give me the task and let me work. I also prefer quiet work spaces. Open offices where everyone's talking loudly make it hard for me to concentrate.`,
        scores: [4, 5, 4],
        avgScore: 4.33,
      },
      {
        text: `Outdoors or field-based work is where I'm most comfortable. I like environments where there's actual physical activity, where you see the results of your work tangibly. I'm not the best sitting at a desk all day. I get restless. But I can do office work when needed, I just function better outside.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Dynamic and creative. Places where new ideas are actually welcome, not just tolerated. I like environments where there's energy and momentum. I also appreciate teams that give feedback openly, both positive and constructive. I grow faster in places that challenge me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Honestly, I like a workplace that's active and dynamic. I don't do well in very strict, quiet offices. I like when there's energy, collaboration, some movement. Construction environments suit me but I can adapt.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I love a fast-paced, warm, and team-oriented environment. Hospitality naturally involves working with a lot of people so I thrive in that kind of setting. I just need a team that communicates well.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Collaborative but structured. I like when there's order and respect in the workplace, but also when people support and learn from each other. A cold, very hierarchical environment makes me less productive.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `A structured but supportive team environment. Healthcare is high-stakes and I need colleagues I can rely on. I don't work well in chaotic places with poor communication.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I love a creative and collaborative environment where ideas are welcomed. I don't do well in very rigid, quiet offices. I work best when there's energy and openness to trying new things.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I prefer a collaborative and intellectually stimulating environment. I like working with people who are passionate about what they do. I also work well independently when I need to write or do research.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I prefer a calm and organized environment. Not too chaotic, you know? I work best when there's a clear task and I know what's expected of me. I don't mind working quietly. I actually focus better when it's not too noisy. But I also don't mind being around people — I just need to know my role so I don't feel lost.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `One that values thoughtfulness and doesn't rush to judgment. I work well in environments where different perspectives are welcomed — not just where the loudest voice wins. I also appreciate some quiet and autonomy. I can collaborate well, but I also need space to think independently.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I like environments where people are genuine and the work has real meaning. I don't do well in very corporate, very formal setups where everything is performance and no real work gets done. I want to actually do something that matters. I'm also comfortable working outdoors or in the field — actually I prefer it.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I prefer an environment where people actually communicate with each other. Not toxic, not full of gossip. Just a place where if there's a problem, you can talk about it openly. I also work better when there's a clear structure, like, I know what my tasks are for the day. I get anxious when things are too chaotic with no direction.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Somewhere calm, respectful, and where people's emotional wellbeing is actually considered. I don't do well in very loud or high-conflict environments. I also appreciate when the workplace actually practices what it preaches. Like, if it's supposed to be a mental health organization, I hope it also takes care of its own employees.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I prefer a practical, no-nonsense environment. I like when tasks are clear and expectations are realistic. I don't really need a fancy workspace, just functional and organized.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Flexible, honestly. I can work at home or in an office, whatever. I just need a decent computer and a stable internet connection. A team that doesn't micromanage every small thing would be great too.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I prefer working in environments close to the actual field or operation. Offices are okay for planning but I'm most productive when I can see and touch the actual work.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Practical and no-nonsense. Give me clear instructions, clear expectations, and let me work. I don't need a lot of hand-holding. I also prefer a team where people are honest with each other — where you can say 'this doesn't look right' without it becoming a political issue.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I prefer a quiet, structured environment with clear processes and expectations. I don't work well in noisy or disorganized settings. I also value a workplace where accuracy is respected, not one where people rush through things just to finish fast.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `Field work and research-based environments are where I thrive. I like being outside, collecting data, observing. Office work is fine but I get restless doing only that. I also prefer environments where people take the mission seriously, not just as a job requirement.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I prefer a quiet and organized workplace where I can focus on my tasks without too many interruptions. I work better when there's a clear structure and everyone knows their responsibilities.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
    ],
  },
  {
    question: `What would your first 30, 60, or 90 days look like in this role?`,
    questionAvgScore: 4.31,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 5, result: 4, reflection: 4 },
    answers: [
      {
        text: `First 30 days — I'd be in full observation mode. Understanding the team, the processes, what works and what doesn't. I'd ask a lot of questions, probably more than people expect. By 60 days, I'd want to be contributing meaningfully to at least some tasks. By 90 days, I want to have built a good rapport with the team and be pulling my own weight completely. And maybe by then I'll have at least one idea to pitch.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `First 30 days would be observation and listening. I want to understand the culture before I contribute — who are the people, what are the unspoken norms, what actually works here versus what's just on paper. 60 days, I'd start bringing my own perspective to the table. By 90 days, I'd want to have built trust with the team and be genuinely adding value in a way that reflects what this company actually needs.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `First 30 days, I'd focus on understanding the existing processes and the people. 60 days, I'd start contributing more actively and flagging things I think can be improved. 90 days, I'd want to already have a small win under my belt — something I can point to and say, 'I made that better.'`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In my first 30 days, I'd focus on understanding the company's processes, systems, and expectations. I'd ask questions and take notes. By 60 days, I'd want to be performing my tasks with less guidance. By 90 days, I want to be a reliable part of the team — someone who can be trusted with important tasks without close supervision.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd be learning — the people, the culture, the expectations. I'd try to be genuinely helpful without overstepping. By 60 days, I'd want to be contributing actively. By 90 days, I'd want to have built real relationships within the team and be someone people feel comfortable approaching.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd spend learning the specific protocols, procedures, and culture of the facility. Every institution does things a little differently. 60 days in, I'd hope to be more independent in my assigned tasks. By 90 days, I'd want to be a reliable member of the care team — someone my colleagues can count on during any shift.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days — I'd be in full learning mode. Understanding the property, the SOP, the team, the regulars. I'd ask a lot of questions and watch closely. By 60 days, I'd want to be handling my responsibilities confidently. By 90 days, I want guests to recognize me, know me, and have a positive association with me — that's my personal benchmark.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd be learning the company's systems and standards. 60 days in, I'd want to be handling tasks on my own. 90 days, I'd want to have contributed something real — found a problem, solved something, added value in a concrete way. Not just settling in.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd be learning everything I can — the organization's programs, the areas they cover, the people I'll be working with. 60 days, I'd start contributing actively. By 90 days, I'd want to have made at least one visit or activity that I led from start to finish and did well. Something concrete.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First month, absorb everything. Get to know the team, the projects, how things work here. Second month, start contributing. Maybe suggest small improvements or take on tasks more independently. Third month, I want to be trusted enough to handle a specific part of a project without constant supervision. That's my plan.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, observe, listen, and learn the procedures and protocols of the organization. I wouldn't assume I know how things work here just because I studied it. Second month, start applying what I've learned and take on responsibilities more actively. Third month, I want to be a reliable part of the team, someone who can be trusted to handle tasks without constant checking.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first month, I'd focus on understanding the work culture, the people, and how things are done. I'd observe more than I act. By the second month, I'd start taking on tasks more independently. By the third month, I'd hope to have built enough trust and understanding to contribute in a way that's actually useful, not just busy work.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First month, understand the system they use, the codebase, the tools, the team structure. I wouldn't assume anything. Second month, start contributing code or tasks that are supervised. Ask a lot of questions. Third month, work more independently, take on more responsibility, and hopefully have something to show for it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first month, I would study the organization's accounting systems, chart of accounts, and reporting procedures. I would not assume that things are done the same way as what I studied. The second month, I would take on actual tasks with supervision. By the third month, I would aim to be working more independently and contributing to the team's output without requiring constant guidance.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, get oriented. Learn the specific programs, the area, the farmers or clients I'd be working with. Understand how the organization operates. Second month, start going to the field, applying what I know while learning the local context. Third month, hopefully take on my own assigned areas or tasks and be trusted to work independently.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd observe, listen, and learn. Understand the school's culture, the students, the policies. I wouldn't walk in thinking I already know how to handle everything. The second month, I'd start applying what I know in the classroom while continuing to learn from my colleagues. By the third month, I'd hope to have built a good relationship with my students and the staff, and be contributing meaningfully to the department.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First month, I'd study the brand, the target market, the competitors, and the team. I wouldn't push my ideas immediately. I want to understand the context first. Second month, I'd start contributing in team discussions and maybe take on a small project. Third month, I want to be someone with real value to offer, not just someone still getting oriented.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First month, learn the organization's programs, the areas they work in, and the methods they use. I wouldn't assume my academic training matches exactly what they do in the field. Second month, participate more actively in fieldwork and data collection. Third month, contribute independently and hopefully be trusted to handle specific aspects of a project.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days, I'd want to understand the project or work I'm assigned to — the scope, the people, the workflow. Days 31 to 60, I'd start taking active parts in the tasks and try to contribute early. By day 90, I'd want to be someone the team can already depend on.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first 30 days, I'd focus on understanding the company standards, the team, and the workflow. In 60 days, I'd try to handle my own responsibilities more confidently. By 90 days, I want to already be contributing ideas and helping newer team members if needed.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days — learn the machines, the systems, and how things run. I'd mostly just observe and ask questions. 60 days — start doing tasks on my own with minimal supervision. 90 days — be fully functional and accountable for my work area.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First month — understand the tools, systems, and team workflows. Second month — take on actual tasks and ask for feedback early. Third month — be more independent and start contributing to improvements if I see any.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first 30 days, I would focus on understanding the school culture, the curriculum, and the learners I'd be working with. By 60 days, I'd be more confident in my lesson delivery and classroom management. By 90 days, I'd hope to have built a good relationship with both students and colleagues.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first 30 days, I'd focus on learning the ward setup, the protocols, and the team dynamics. By 60 days, I'd want to be managing patients with minimal supervision. By 90 days, I want to be a dependable member of the ward team.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days — absorb everything. Understand the brand, the target audience, the tone of communication. 60 days — propose ideas based on what I've observed and start contributing to ongoing campaigns. 90 days — be actively involved in creating content and strategies.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `First 30 days — understand the organization, the programs, and the communities or areas being served. 60 days — start contributing to field work and operations. 90 days — take on responsibilities independently and give feedback based on my observations.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first 30 days, I'd want to fully understand the organization's voice, audience, and current communication strategies. In 60 days, I'd start drafting or contributing to actual content or materials. By 90 days, I'd want to have a clear picture of what needs improvement and have some proposals ready.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In the first 30 days, I'd probably focus on learning — understanding the processes, getting to know the team, and making sure I don't make early mistakes out of confusion. By 60 days, I hope I can already handle some tasks on my own. And by 90 days, I want to be someone the team can depend on for at least the basic responsibilities. I'm not expecting to master everything fast, but I want to make steady progress.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `In my first 30 days, I'd focus on learning the hospital's system and policies. I don't want to assume things are the same as what I practiced in school. In the next 30 days, I'd try to be more independent with my tasks while still asking for guidance when needed. By the 90th day, I hope to already feel more comfortable with the team and be contributing properly without needing constant supervision.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `First 30 days, I'd be very observant. Learn the culture, the people, the workflow. I wouldn't try to change anything yet, I'd just soak everything in. Second month, I'd try to take on tasks and contribute more actively. Third month, I hope to already have built some trust with my team and be able to contribute ideas that are useful and relevant.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `In the first 30 days, I would focus on understanding how things work here — the processes, the systems, the people. By 60 days, I'd try to take on my actual tasks and make sure I do them correctly. By 90 days, I hope to be more confident and independent in my work.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Where do you see yourself in five years?`,
    questionAvgScore: 4.22,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Hopefully in a managerial or supervisory role. I want to be managing something — a team, a process, a department. I'm not rushing it, but that's the direction I want to go. I also want to be financially stable enough to help my younger siblings with their schooling.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I'd love to be a front office manager or events coordinator at a decent hotel or resort. Maybe even eventually run events independently. Honestly, if things go really well, I dream of having my own small events business one day. But one step at a time — I want to learn properly first.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Hopefully not still an entry-level dev. I want to be someone who can lead a small team or manage a specific project. I'd also like to specialize, maybe in cybersecurity or systems analysis. Five years is a long time, so I just want to make sure I'm actually growing and not just collecting years of experience without learning anything.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to be working as an agricultural technician or extension worker, helping farmers in my province, people like my dad, access better farming practices and resources. If I can, I'd also like to try to improve our own family farm using what I've learned. Five years from now, I want to feel like my degree is actually being used to help people.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I hope to be a full-time teacher, probably in a public school. I'd like to be not just a classroom teacher but someone involved in curriculum improvement or student development programs. I'm also considering taking up graduate studies in Education in the future. Five years from now, I want to be confident that I'm making a real difference in at least a few students' lives.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `I want to be a marketing manager or at least a senior team member in a growing company. I'd love to work on campaigns that actually reach real people and change behavior. I'm also open to eventually building something of my own. My parents showed me what it's like to run a business and I have that in the back of my mind.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Working in environmental monitoring, conservation, or sustainability programs, hopefully for a government agency or an NGO. I'd also like to pursue graduate studies in environmental management eventually. Five years from now, I want to feel like my work is contributing to something bigger than just a paycheck.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I hope to be working in a supervisory or team lead role in a hotel or events company. I also want to have my own small events planning business on the side, even just part-time.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `In five years, I hope to be working in content strategy, public relations, or media. I'd like to be in a position where I'm helping shape how an organization communicates with its audience. I'm also open to pursuing graduate studies in communication.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Five years from now, I want to be in a role where I'm not just doing tasks but actually contributing to decisions. Like, I want to be someone whose opinion is considered. I also want to specialize in something I'm genuinely passionate about. I don't have it perfectly mapped out, but I know I want to keep growing — not stay in the same place just because it's comfortable.`,
        scores: [5, 4, 4],
        avgScore: 4.33,
      },
      {
        text: `I hope to be a CPA by then — I'm planning to take the board exam after gaining some experience. Beyond that, I'd like to be in a supervisory role where I can contribute more and also help others who are newer in the field. My parents always wanted me to reach that level, and honestly so do I.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I hope to be working in agricultural extension services or maybe with an NGO that supports farmers. I also want to be able to help my family's farm use better practices. And honestly — and I'm not embarrassed to say this — I want to be able to send my younger siblings to college without my parents having to worry.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I plan to take the CPA board exam and, God willing, pass it in my first attempt. Five years from now, I hope to be a licensed CPA working in a reputable firm or organization, handling more complex financial work. I also want to be able to help my family financially and give back to my parents who sacrificed a lot for my education.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In five years, I hope to be a licensed CPA already. I want to have stable work and be able to help my family. I'm not really dreaming of being a manager right away, I just want to do my job well first.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `In five years, I see myself handling my own projects maybe as a project engineer or site engineer. I also want to pass my board exam. Long-term, I'd love to have my own small contracting business someday.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Maybe a mid-level developer or systems analyst. I haven't decided if I want to stay technical or shift to something more managerial. I'll see where things go. I just want to be good at what I do.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I want to be a marketing specialist or brand manager. In five years, I hope to be handling actual campaigns for a growing company. Eventually, I'd love to have my own marketing consultancy.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `In five years, I want to be working in agricultural extension or development, helping farmers improve their practices and yields. I also want to pursue further studies in agronomy.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `If I stay in education, I'd like to be a full-fledged teacher with my own class and maybe starting to take on curriculum development. If I'm in a different field, I'd like to be in a role where I'm still helping people learn or grow in some way — training, communications, something like that. I just know I want to be doing something meaningful.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `Ideally, working in a hospital, either here or abroad, in a specialized unit. I'm interested in critical care. I also want to pass the nursing board exam and work toward advancing my practice. Long term, I'd like to be in a role where I can also mentor younger nurses.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Hopefully working as a licensed civil engineer — I plan to take the board exam soon. Maybe by then handling my own projects, or at least leading a small team. I also want to be stable enough to support my family more.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Honestly? I want to be a licensed engineer, I'm taking the board exam soon, and working on actual infrastructure projects. Maybe roads, bridges, public buildings. I want to do something visible. Something I can point to and say, "I worked on that." Five years from now, I want to be part of a real project team, not just an assistant.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to be working in law enforcement or public safety in a stable, meaningful position. Maybe in the PNP or a government agency focused on crime prevention. I'd also like to pursue advanced studies, maybe a criminology specialization or a law degree eventually.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I want to be working in a government office, specifically in community development or local governance. Maybe a local government unit. I'd love to be involved in programs that directly help people. In five years, I hope I'm already making real contributions, not just an entry-level worker anymore.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `I hope to be a licensed professional teacher and be a regular teacher in a school that values professional development. I also want to maybe pursue a master's degree in literature or education management.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `In five years, I want to be a well-rounded clinical nurse. I'd also like to pass exams that would allow me to work abroad if the opportunity comes, but I want to gain solid local experience first.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Honestly, I haven't planned super far ahead. But I hope that in five years, I'm already more confident in my skills and maybe holding a stable position in whatever company I end up in. I also want to support my parents by then, because they worked really hard for my education. That's really my main motivation — to give back to them.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `Honestly, I'm still figuring out the exact path. I know I want to be in a role that involves understanding people — whether that's HR, counseling, community work, or organizational development. I hope to also be pursuing further studies by then, maybe a master's degree in something related to human behavior or organizational psychology.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I hope to be a stable nurse by then, maybe already working in a hospital here in the Philippines or, if possible, abroad. I also want to take additional training, maybe in critical care. And personally, I want to be able to help my family financially by that time. That's honestly my biggest motivation.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I want to be a licensed mechanical engineer in the next two or three years. In five years, I'd like to be working in maintenance or operations, handling actual machinery.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I'm honestly still figuring out my specific path, but I know I want to be working with people, either in counseling, HR, or community programs. I'd also like to take graduate studies in psychology eventually. Five years from now, I hope I have a clearer sense of direction and some meaningful work experience behind me.`,
        scores: [2, 4, 3],
        avgScore: 3.0,
      },
    ],
  },
  {
    question: `Who has impacted you most in your career and how?`,
    questionAvgScore: 4.54,
    totalAnswers: 41,
    breakdown: { situation: 5, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `My thesis adviser, Sir Mendoza. He's the kind of teacher who challenges you in a good way — never lets you settle for 'okay, enough.' He made us defend every decision we made in our project, which was annoying at the time but taught me to think critically. He also told me something I'll never forget: 'Being smart isn't your advantage — being consistent is.' And I think about that a lot because I know I can be scattered sometimes.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `My high school English teacher, Ma'am Soria. She was the kind of teacher who treated students like they were capable of great things, even when they didn't believe it themselves. She told me once that I had a gift for expression and that I should use it. That moment literally changed my life. I decided to be a teacher because of her.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `My mother. She's been working at the RHU for 20 years and never once complained about the workload. She treats every patient with the same care regardless of who they are. She showed me what it looks like to do a thankless job with grace. That's the kind of professional I want to be.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `My professor in Personality Theory, Dr. Santos. She was the kind of teacher who taught you how to think, not just what to think. She challenged every assumption. She once told me: 'The most dangerous thing about understanding people is thinking you've finished understanding them.' I apply that to every interaction. People are always more complex than our first read.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `My thesis adviser, Dr. Mateo. He was very demanding but he cared about the quality of our work. He pushed us to think critically about our data and not just accept surface-level findings. He also genuinely cared about the environment, not just as a subject to study. That combination of rigor and passion is what I want to bring into my work.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `My father. He's a barangay captain so I grew up watching him deal with all kinds of people and problems. He always said, 'Know what the problem really is before you offer a solution.' I carry that in everything I do. Don't react to the surface — dig a little.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My parents, both of them. Growing up in a household of teachers, I was surrounded by people who believed that knowledge is something you earn through effort. They never pushed me to take shortcuts. My mom especially always said, 'Do it right the first time, so you don't have to redo it.' That became my working philosophy.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My parents, definitely. Running a carenderia doesn't sound like much, but watching them care for their customers — remembering names, remembering who liked more rice, always greeting everyone warmly — that shaped how I think about hospitality. It's not about the scale; it's about the sincerity.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My dad. He's a construction worker — not an engineer — but he knows more about practical building than some people I've met with degrees. He taught me to look at things carefully, check twice, and never rush a structural decision. That mindset is directly relevant to engineering.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My father. He's a farmer who never went to college, but he knows the land better than anyone I've met. He always told me that the land tells you what it needs — you just have to pay attention. That's actually a big part of good agricultural science. He made me love this work before I even knew it was a career.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My professor in Criminal Law, Sir Buenaventura. He was ex-military and very strict. He made us memorize everything, and at first I resented it. But later I understood. In this field, not knowing the law isn't just a bad grade, it can put people in danger. He taught me to take knowledge seriously.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `My professor in Auditing, Sir Constantino. He was extremely strict and his exams were very difficult, but he prepared us well. He used to say that an auditor's reputation is their most valuable asset. That stayed with me. It reminded me that beyond technical skill, integrity is what defines a good accountant.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My professor in Crop Science, Sir Domingo. He was a real farmer before he became a teacher, so everything he taught had practical weight. He'd take us to the field and show us what he meant. He also had a deep respect for farmers. He never talked down about them. That attitude shaped how I see my own work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My high school English teacher, Sir Abayan. He saw potential in me when I didn't see it in myself. He encouraged me to join essay writing competitions, gave me feedback that was honest but kind, and showed me that a teacher's belief in a student can change that student's trajectory. He's the reason I'm applying for this position today.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My marketing professor, Sir Valencia. He was the first teacher who pushed us to look at real campaigns, not just textbook ones. He'd show us local brands that were doing things right or wrong and make us analyze them. He made the course feel relevant. He also always said, "Marketing without empathy is just noise." I think about that a lot.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My father honestly. He taught me how things work in the field before I even stepped into a classroom. He showed me how to read plans, how to talk to workers, how to handle pressure. That's real experience you don't get in school.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My OJT supervisor at the hotel impacted me the most. She taught me that service is not just about doing tasks — it's about making people feel valued. She was firm but kind, and she pushed me to always go the extra mile.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My uncle who is a mechanic. Not an engineer, but he's been fixing machines for 30 years. He taught me how to diagnose problems properly — don't assume, always trace the root cause. That's how I approach engineering problems now.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My cooperating teacher during student teaching, Ma'am Elena. She was strict but very thorough. She showed me how to plan lessons that actually meet the needs of real learners, not just the textbook. She also showed me grace under pressure.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My mother. She's been a midwife for over 20 years and she approaches every patient with the same level of care, whether it's a complicated case or a simple checkup. She taught me that compassion is not optional in healthcare.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `A marketing professor in college who gave me real feedback instead of just grades. She told me my ideas were good but my execution was inconsistent. She pushed me to follow through, not just imagine. That changed the quality of my work.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My grandfather. He's been farming the same land for 40 years and he still finds ways to improve every season. He never read a textbook but he understands the land better than most people I've met. He taught me to respect nature and to observe before acting.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My father, who is a journalist. He taught me how to ask the right questions, how to listen without interrupting, and how to find the real story underneath the surface. He's also shown me the value of integrity in communication — that the way you handle information says a lot about who you are.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My older cousin. She's the one who encouraged me to take IT in the first place. She graduated from a different school but she always told me that the field has a lot of opportunities if you just keep learning. She would share articles with me and check on my studies. She's not like a mentor in a formal way, but she's the reason I didn't give up during the hard semesters.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `My clinical instructor, Ma'am Reyes, impacted me the most. She was strict, but she always explained the reason behind everything she taught us. She used to say, "You're not just learning a skill, you're learning how to protect someone's life." That changed how I look at nursing. It's not just a job, it's a responsibility.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My OJT supervisor, Engr. Tolentino. He was no-nonsense, didn't sugarcoat anything. If my computation was wrong, he'd tell me straight. But he also took time to explain things. He showed me what a real engineer looks like in the field, not just someone who knows formulas, but someone who knows how to manage people and solve real problems.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My professor in Local Government, Ma'am Lacsamana. She used to say, "Ang gobyerno ay hindi abstract, ito ay mga tao." Government is not abstract, it's people. That stuck with me. She made us do community interviews and fieldwork, and through that I saw how government decisions affect real lives. It made me more serious about this path.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My professor in Abnormal Psychology, Ma'am Santiago. She made psychology feel real, not just theory. She shared real cases, she talked about the complexity of mental health, and she never made it feel clinical or cold. She taught us that every person behind a diagnosis is still a full human being. That perspective shapes how I approach people.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My professor in System Analysis and Design, Sir Manalo. He was the kind of teacher who didn't just teach the concept. He made us apply it to real scenarios. He was brutally honest about our outputs. If your design was bad, he'd tell you exactly why. That kind of feedback, even when it stings, is what actually makes you better.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My mother had the biggest impact on me. She always reminded me to be careful and not to cut corners. She said that if you do things right from the start, you won't have to fix it later. That stuck with me especially in accounting.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Still my dad. Even now, I call him whenever I'm stuck on something. He's the one who lit the fire in me for engineering. His advice is practical and always grounded in real experience.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My OJT supervisor, Ms. Ana. She showed me what real hospitality leadership looks like — firm, fair, and always putting the guest first. She told me, 'People remember how you made them feel.' That has stayed with me.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Still my uncle. He never went to college but he knows machines better than most engineers I've met. He taught me patience and thoroughness — two things that matter more than textbooks.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `An online content creator I followed really pushed me toward freelancing early. He shared how he landed his first clients and built skills from scratch. It made me realize I didn't have to wait to graduate to start learning real-world stuff.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Ma'am Elena, my cooperating teacher. She was the first person to tell me that I was capable of becoming a truly effective teacher. That belief changed how I saw myself in the classroom.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Still my mother. She hasn't changed — still quietly dedicated, still putting her patients first. Every time I'm tired or frustrated at work, I think of her and I keep going.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My marketing professor, Ma'am Cruz. She was the first person to challenge me not just on ideas but on execution. Her feedback was hard to hear at first but it made me a better marketer.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My grandfather. He's never gone to school but he has more wisdom about land and life than anyone I know. He showed me what genuine dedication to one's work looks like, and that the impact of your work matters more than the title you hold.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My father remains the biggest influence on how I think about communication. He showed me that a good communicator first has to be a good listener and a good thinker. He didn't just teach me how to write — he taught me how to see.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `As I mentioned, my mother really had the biggest influence on me. She taught me to be diligent and honest. She said that in accounting, integrity is everything. That's something I carry with me all the time.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `That online creator I mentioned. He wasn't anyone famous, just a developer who shared his journey openly. He showed me that you can learn by doing and you don't need to wait for the perfect moment to start.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Who has impacted you most in your career and how? (2)`,
    questionAvgScore: 4.5,
    totalAnswers: 10,
    breakdown: { situation: 5, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Sir Mendoza again. He's the reason I take my work seriously even when no one's watching. He had this habit of asking us, 'Would you be okay if everyone saw how you did this?' — meaning, do things with integrity even when it's not graded. That question stuck with me. I try to apply it to everything I do.`,
        scores: [5, 5, 5],
        avgScore: 5.0,
      },
      {
        text: `It's still my cousin. She's the one who made me believe that someone from a province, from a simple family, can still have a good future in this field. She would always say, 'You don't need to be the smartest — you just need to be consistent.' That stuck with me. Every time I felt like giving up during school, I thought about that.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My parents, always. But professionally, my thesis adviser also left a big impact. She was very strict — she would not approve anything that wasn't precise — but because of her, I developed a very high standard for my own work. I'm grateful for that, even if she made me redo things many times.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My mother, without question. Every time I'm tired or feel like the work is too heavy, I think about her and how she's done this for two decades without losing her heart for it. That's who I want to be.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `My father, always. He didn't study agriculture, but he lived it. Every morning he'd be up before me and already in the field. He showed me what it means to commit to something even when it's hard, even when the weather doesn't cooperate, even when the prices drop. That's the kind of dedication I bring to whatever I do.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Ma'am Soria, my high school teacher, always. She proved to me that one person can genuinely change another person's trajectory. That's power. And it inspired me to want that same kind of impact — on students, on colleagues, on whoever I work with.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My parents. They never studied hospitality formally, but they run their carenderia with more genuine care than some four-star restaurants I've seen during OJT. They taught me that hospitality isn't about the setting — it's about the intention behind every interaction.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My dad. He's worked construction his whole life and he's proud of what he builds. He always told me, 'Mark, whatever you build, make sure you're not embarrassed by it.' That's my standard for everything I work on.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Dr. Santos, my professor. She redefined how I understand people, including myself. She never let me settle for a surface answer — she always pushed deeper. Because of her, I approach everything with more curiosity and more humility. I know now that I'll never fully understand people, and that's exactly why the work never gets boring.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Still my father. He didn't go to college but he manages a whole barangay. He taught me that leadership isn't about a title — it's about showing up and doing what needs to be done. That's what I bring to work every day.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Who has impacted you most in your career and how? (closing)`,
    questionAvgScore: 4.39,
    totalAnswers: 11,
    breakdown: { situation: 5, task: 4, action: 4, result: 4, reflection: 5 },
    answers: [
      {
        text: `Sir Constantino, my auditing professor. And my parents. Watching them manage their store, count their earnings every night, and budget carefully for our education taught me the real value of financial responsibility. I am doing this for them.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Sir Valencia, my professor. But also my parents. Watching them try to market their printing business with almost no budget, just word of mouth and hard work, taught me that marketing at its core is just building trust and relationships. All the fancy strategies are just tools. That realization keeps me grounded.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Dr. Mateo, my thesis adviser. But also, the farmers near our community who my family knows. They talk about how the seasons have changed, how the rains are unpredictable now, how some years the harvest is bad for no clear reason. They experience climate change in their hands and their stomachs, not in graphs. They remind me why this work matters beyond the academic.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I already mentioned Ma'am Reyes, my CI, but outside of school, it's my mother. She's a teacher and she raised us to always do our best even when things are hard. Watching her go to work every day without complaining taught me what dedication really looks like. That's something I carry with me in nursing, the idea that showing up and doing your job with heart matters more than anything else.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Still my OJT supervisor, Engr. Tolentino. But also my dad. Even though he's just a carpenter, the way he talks about quality work and not cutting corners really stuck with me. He'd say, "Kung gagawin mo, gawin mo ng tama." If you're going to do it, do it right. That's something I always carry on the job.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Ma'am Lacsamana, my professor. But also, my lola. She used to be a barangay health worker for many years, no salary, just service. She taught me that serving others is a privilege, not a burden. Whenever I feel tired or demotivated, I think of her and I get up again.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Ma'am Santiago stays as my answer. But I also want to mention a client I worked with briefly during internship. I can't share details, but working with someone going through a genuinely difficult time reminded me why I chose this field. That experience grounded me. It made everything we studied feel real.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Sir Manalo again. But also, kind of embarrassingly, YouTube. I know that sounds weird, but a lot of what I know practically came from watching developers explain their process online. It taught me that learning doesn't stop after school and that the best developers share what they know instead of hoarding it.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Sir Domingo, my professor. But more than anyone, my father. He's been farming for 30 years without formal training, just experience. Watching how hard he works for our family is the reason I finished school. I want to use what I learned to make his kind of work a little easier for future farmers.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `Sir Abayan, always. But I also want to mention a student from my practicum. A boy named Jomar who had almost given up on English because he felt like he was too behind. By the end of my practicum, he was writing full paragraphs. That experience reminded me why I chose this path. Sometimes the most important impact you make isn't on your career. It's on a child who needed someone to believe in them.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `My father, without a doubt. He spent years doing barangay duty for almost nothing, no fame, no big salary. But he believed in the importance of keeping his community safe. That kind of quiet dedication is what shaped my values. He never told me to go into this field, but everything he showed me pointed in this direction.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
    ],
  },
  {
    question: `Why should we hire you?`,
    questionAvgScore: 4.08,
    totalAnswers: 31,
    breakdown: { situation: 4, task: 5, action: 5, result: 4, reflection: 4 },
    answers: [
      {
        text: `I think I can contribute accuracy and consistency to your team. I'm not someone who cuts corners, especially with numbers. I understand how important precision is in this field, and I take that responsibility seriously. I'm also very willing to learn whatever systems or processes your company uses.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Because I genuinely love this industry. This isn't just a job to me — I grew up in it. I'm passionate about service and creating good experiences for people. I bring energy, warmth, and a real commitment to making sure guests feel valued. And I learn fast — you put me in a new environment and I'll adapt.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `I think I bring a perspective that's not always represented in teams — an understanding of human behavior and interpersonal dynamics. I notice things about how people interact, what motivates them, what causes friction. That kind of insight is useful in any team environment. And I'm genuinely curious and hardworking. I won't check out when things get difficult.`,
        scores: [4, 5, 5],
        avgScore: 4.67,
      },
      {
        text: `Because I take my responsibilities seriously. I'm not here to impress, I'm here to do the job right. I understand what this field demands and I'm prepared for it. I don't cut corners, and I'm honest even when it's not the easy thing to be.`,
        scores: [5, 4, 5],
        avgScore: 4.67,
      },
      {
        text: `Because I bring something that's hard to teach — the ability to genuinely connect with people. I'm dependable, I communicate clearly, and I care about the work I do. I also bring a different perspective from my background in education, which I think adds something unique to a team.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Because I actually enjoy the work. I'm not applying just to have a job, I genuinely like building and fixing systems. People who like their work usually do it better than people who don't. Also, I'm honest, I don't make up answers when I don't know something, and I pick things up quickly.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I am hardworking, accurate, and dependable. I understand what accounting work requires. It's not just computing numbers, it's ensuring integrity and accuracy in everything. I may not have years of experience, but my foundation is strong and my work ethic is even stronger. I don't take shortcuts when it comes to numbers.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Because I know the work, not just the theory. I grew up in farming, I studied it formally, and I did my OJT on a commercial farm. I understand the ground level, what it's actually like to be in the field. I'm not afraid of hard work, I'm not picky about tasks, and I genuinely care about agriculture and what it means for communities like mine.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `Because I bring both creativity and drive. I don't just think outside the box, I actually want to test whether those ideas work. I'm also someone who keeps up with trends. I pay attention to what's happening in the market, not just in school. And I genuinely enjoy this work, which I think shows.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I'm a fast learner, I work well with others, and I bring energy to the team. I'm not gonna pretend I know everything, but I'm the type who figures things out quickly. You won't have to babysit me for long.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I can learn fast and I don't need constant guidance once I understand what's needed. I'm resourceful — I figure things out on my own before asking for help. And I don't cause drama in teams.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I bring a calm, patient, and detail-oriented approach to my work. I take patient care seriously and I'm not the type to panic. I also work well in teams, which is essential in any healthcare setting.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I can help you reach your audience in a creative and relevant way. I'm not just book-smart about marketing — I've actually run social media accounts and campaigns before. I know what works and what doesn't, at least on a small scale.`,
        scores: [4, 4, 5],
        avgScore: 4.33,
      },
      {
        text: `I may not be the most polished applicant but I'm dependable and I genuinely care about the work. I grew up in this field — not just studied it. That combination of education and lived experience is something not everyone has.`,
        scores: [3, 5, 5],
        avgScore: 4.33,
      },
      {
        text: `I don't want to sound too confident, but I think I can offer consistency. I'm not the flashiest candidate, but I show up, I do the work, and I don't stop until it's done right. I'm still learning a lot of things, but I'm very willing to learn. And I think being careful and detail-oriented is something that can actually help in a job like this.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Because I'll actually care about the work. I'm not just here to clock in and clock out. I'm the kind of person who gets invested in what I'm doing. I'll ask questions, I'll share ideas, and I'll push for things to be better. I might not have years of experience yet, but I have energy, curiosity, and I learn fast. And I'm not afraid to admit when I don't know something — I'll just go figure it out.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `I work hard, I'm honest, and I know the practical side of what I studied — not just the classroom version. I grew up around agriculture, so what I've learned in school makes more sense to me than to someone who only ever read about it. I'll give this job everything I have.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `Because I'm someone who doesn't just sit and wait for instructions. I take initiative. If I see a problem, I say something. If I have an idea, I share it. I'm not the perfect engineer yet, I'm still learning, but my attitude toward work is strong. I show up ready and I give my full effort every time.`,
        scores: [4, 4, 4],
        avgScore: 4.0,
      },
      {
        text: `Because this work actually means something to me. I'm not applying because it was the first job posting I saw. I care about environmental issues and I want to contribute to solutions. I may not have years of experience, but my foundation is solid and my commitment is real.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I think you should consider me because I'm someone who takes my work seriously. I may not be the most confident person in the room, but I always make sure my output is accurate and complete. I'm also willing to learn and I won't cause problems in the team.`,
        scores: [2, 5, 5],
        avgScore: 4.0,
      },
      {
        text: `I have genuine passion for service. I don't just go through the motions — I actually care about the experience of the people I'm serving. I'm hardworking, presentable, and I'm very willing to do whatever it takes to make an event or service run smoothly.`,
        scores: [3, 5, 4],
        avgScore: 4.0,
      },
      {
        text: `I understand people and how to communicate with them. That's a skill that's useful in almost any role — whether it's writing, public relations, content creation, or even internal communications. I also bring genuine curiosity and attention to how messages land.`,
        scores: [3, 4, 5],
        avgScore: 4.0,
      },
      {
        text: `Because I deliver. I don't make excuses and I don't wait for someone to hand-hold me. I figure things out and get the job done. I'm also practical — I think about what actually works, not what sounds good in theory.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I'm reliable, I'm calm in difficult situations, and I genuinely care about the people I work with and for. I take responsibility seriously. In healthcare, the stakes are high, and I understand that. I don't cut corners. I show up.`,
        scores: [2, 5, 4],
        avgScore: 3.67,
      },
      {
        text: `I show up. I do the work. I don't disappear when things get hard. I might not be the most polished candidate but I'm the kind of person who will figure things out and not make excuses. And I care about doing the job right — not just doing it fast.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `Honestly, I'm not the most confident person, but I'm someone you can rely on. I show up, I do my job, and I genuinely care about the patients. I may not be the loudest or most impressive applicant, but I promise I won't let the team down. I'm also still learning, and I think that's a good thing. I'm open to being corrected and taught.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I'm someone who genuinely cares about the work. Not just doing it for the paycheck, I actually want to be useful to people. I'm hardworking, I'm easy to work with, and I bring positive energy to a team. Plus, I'm flexible. I don't complain much when things change or get difficult. I just adjust and keep going.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `I bring a different kind of value. I understand people. In a workplace setting, whether it's HR or counseling or community work, understanding how people think and feel is important. I'm careful, I'm trustworthy, and I take the emotional side of work seriously, not just the tasks.`,
        scores: [2, 4, 5],
        avgScore: 3.67,
      },
      {
        text: `Because I care, not just about delivering a lesson, but about the people I'm delivering it to. I'm not the most confident person in the room, but I prepare well and I give everything to my work. I'm also very open to feedback and to growing. I don't think I have everything figured out, and that makes me someone who keeps improving.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I bring genuine dedication to the work. I'm not in education for the salary — I chose it because I believe in it. Someone who truly cares about the job is usually more willing to go the extra mile.`,
        scores: [3, 4, 4],
        avgScore: 3.67,
      },
      {
        text: `I'm not going to give you a sales pitch. I'll just say I show up, I work, and I don't create problems. If you give me a task, I'll do it properly. That's honestly what I can offer.`,
        scores: [2, 4, 3],
        avgScore: 3.0,
      },
    ],
  },
];

export default robertaDataset;