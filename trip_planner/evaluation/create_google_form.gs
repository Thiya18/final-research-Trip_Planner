/**
 * Creates the usability-test Google Form (SUS + satisfaction) and a linked response spreadsheet.
 * How to use: open https://script.google.com -> New project -> paste this file -> Run createUsabilityForm
 * -> allow the permissions. The form and sheet links are printed in the Execution log.
 */
function createUsabilityForm() {
  var form = FormApp.create('Lanka Trip Planner: Usability Questionnaire');
  form.setDescription(
    'Thank you for testing the Lanka Trip Planner app. This questionnaire is part of a university research ' +
    'project. It takes about 5 minutes. Your answers are anonymous: we do not collect your name, email or ' +
    'contact details, and results are reported only in summary form.');
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);   // participants share the test phone or laptop
  form.setShowLinkToRespondAgain(true);
  form.setProgressBar(true);

  var scale = function (title) {
    form.addScaleItem().setTitle(title).setBounds(1, 5)
        .setLabels('Strongly disagree', 'Strongly agree').setRequired(true);
  };

  // ---- Section 1: researcher fills this in before handing over the device --------------------------------
  form.addSectionHeaderItem().setTitle('Researcher use only')
      .setHelpText('To be completed by the researcher before the participant answers.');
  form.addTextItem().setTitle('Participant ID (e.g. P01)').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Task completed without help?')
      .setChoiceValues(['Yes', 'No']).setRequired(true);
  form.addTextItem().setTitle('Time from "Start planning" to the itinerary screen (seconds)')
      .setValidation(FormApp.createTextValidation().requireNumber().build()).setRequired(true);

  // ---- Section 2: consent -----------------------------------------------------------------------------------
  form.addPageBreakItem().setTitle('Consent');
  form.addMultipleChoiceItem()
      .setTitle('I am 18 years or older, I have been told the purpose of this study, and I agree to take part ' +
                'voluntarily. I understand that I can stop at any time.')
      .setChoiceValues(['I agree']).setRequired(true);

  // ---- Section 3: about you ---------------------------------------------------------------------------------
  form.addPageBreakItem().setTitle('About you');
  form.addMultipleChoiceItem().setTitle('Which describes you?')
      .setChoiceValues(['International visitor', 'Sri Lankan resident']).setRequired(true);

  // ---- Section 4: System Usability Scale (standard 10 items, "system" -> "app") -----------------------------
  form.addPageBreakItem().setTitle('Using the app')
      .setHelpText('For each statement, choose how much you agree. Answer quickly; there are no right or wrong answers.');
  [
    'I think that I would like to use this app frequently.',
    'I found the app unnecessarily complex.',
    'I thought the app was easy to use.',
    'I think that I would need the support of a technical person to be able to use this app.',
    'I found the various functions in this app were well integrated.',
    'I thought there was too much inconsistency in this app.',
    'I would imagine that most people would learn to use this app very quickly.',
    'I found the app very cumbersome to use.',
    'I felt very confident using the app.',
    'I needed to learn a lot of things before I could get going with this app.'
  ].forEach(function (s, i) { scale('S' + (i + 1) + '. ' + s); });

  // ---- Section 5: satisfaction (Table 5.7) ------------------------------------------------------------------
  form.addPageBreakItem().setTitle('Your trip plan');
  [
    'The recommended places matched my interests.',                  // recommendation relevance
    'The plan felt personalised to me.',                             // perceived personalisation
    'The day-by-day itinerary was useful.',                          // itinerary usefulness
    'The route and timing were practical.',                          // route usefulness
    'The budget estimate was useful.',                               // budget usefulness
    'The crowd information was useful.',                             // crowd-awareness usefulness
    'Overall, I am satisfied with the trip plan.'                    // overall satisfaction
  ].forEach(function (s, i) { scale('T' + (i + 1) + '. ' + s); });
  form.addParagraphTextItem().setTitle('Anything we should improve? (optional)');

  form.setConfirmationMessage('Thank you! Your answers have been recorded.');

  var sheet = SpreadsheetApp.create('Lanka Trip Planner: Usability Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Form to share:   ' + form.getPublishedUrl());
  Logger.log('Edit the form:   ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + sheet.getUrl());
}
