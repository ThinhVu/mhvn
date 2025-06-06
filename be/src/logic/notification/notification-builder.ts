import {AppEvents} from "../../constants/app-events";
import {INotificationData} from "../../constants/app-types";
import {alert} from "../../utils/rt-alert";
import i18n from "../../i18n";

function getLang(language: string) {
  return i18n[language || process.env.PREFER_LANGUAGE || 'en']
}

const notificationBuilder = {
  [AppEvents.SYSTEM_NOTIFICATION]: async (payload: INotificationData, language: string) => {
    const {from, data} = payload
    const lang = getLang(language)
    console.log('notificationBuilder', AppEvents.SYSTEM_NOTIFICATION, from, data)
    return {
      title: lang.SystemNotification,
      body: "Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups."
    }
  },
}

export async function buildNotification(event: string, data: INotificationData, language: string) {
  try {
    const buildNotify = notificationBuilder[event]
    if (buildNotify)
      return await buildNotify(data, language)
    return undefined
  } catch (e) {
    alert('notification::buildNotification', JSON.stringify({
      event,
      data,
      language,
      error: e.message
    }))
    return undefined
  }
}