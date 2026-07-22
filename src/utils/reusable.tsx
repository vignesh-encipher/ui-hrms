'use client';

import React from 'react';
import { Button } from 'antd';
import { notification } from '@/utils/antdStatic';

export const getResponePopup = (res: any, showMore = false) => {
  const notificationKey = "global-response-notification";
  if ((res?.data?.message || res?.message)?.length > 500) {
    let data = res?.data?.message || res?.message;
    let isSplit = data?.includes(": ");
    let message = data?.split(": ");
    notification.warning({
      key: "status-warning",
      message: isSplit ? message?.[0] + "." : "Something went wrong",
      duration: 4,
      btn: (
        <Button
          className="btn btn-primary btn-sm"
          onClick={() => {
            getResponePopup(res, !showMore);
          }}
        >
          {showMore ? "Less" : "More"}
        </Button>
      ),
      description: showMore ? (
        <div
          style={{ height: "100px", overflowY: "auto", whiteSpace: "pre-wrap" }}
        >
          {isSplit ? message?.[1] : data}
        </div>
      ) : null,
    });
    return;
  }
  switch (res?.data?.status ? res?.data?.status : res?.status) {
    case "USER_DEFINED_ERROR":
      return notification.warning({
        key: notificationKey,
        message: res?.data?.message ? res?.data?.message : res?.message,
        duration: 3,
      });
    case "SUCCESS":
      return notification.success({
        key: notificationKey,
        message: res?.data?.message ? res?.data?.message : res?.message,
        duration: 2,
      });
    case "FAILED":
      return notification.error({
        key: notificationKey,
        message: res?.data?.message ? res?.data?.message : res?.message,
        duration: 2,
      });
    case "EXCEPTION":
      return notification.error({
        key: notificationKey,
        message: res?.data?.message ? res?.data?.message : res?.message,
        duration: 3,
      });
    case "CUSTOM_EXCEPTION":
      return notification.error({
        key: notificationKey,
        message: res?.data?.message ? res?.data?.message : res?.message,
        duration: 2,
      });
    default:
      const msg = res?.data?.message || res?.message;
      if (msg) {
        const isError = res?.status >= 400 || res?.data?.status === 'error' || String(res?.status).startsWith('5') || String(res?.status).startsWith('4');
        if (isError) {
          notification.error({
            key: notificationKey,
            message: msg,
            duration: 3,
          });
        } else {
          notification.info({
            key: notificationKey,
            message: msg,
            duration: 2,
          });
        }
      }
      break;
  }
};
